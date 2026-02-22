import type { SiteShimejiChatMessage } from "@/lib/site-shimeji-chat";

type ChatRequestMessage = { role: "system" | "user" | "assistant"; content: string };

function getLastUserMessageText(messages: ChatRequestMessage[]): string {
  const lastUser = [...messages].reverse().find((entry) => entry.role === "user");
  return String(lastUser?.content || "").trim();
}

function normalizeOpenClawGatewayUrl(rawUrl: string): string {
  const fallback = "ws://127.0.0.1:18789";
  const input = String(rawUrl || fallback).trim();
  const withProtocol = /^[a-z]+:\/\//i.test(input) ? input : `ws://${input}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error(`OPENCLAW_INVALID_URL:${input || fallback}`);
  }

  if (parsed.protocol === "http:") parsed.protocol = "ws:";
  if (parsed.protocol === "https:") parsed.protocol = "wss:";
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(`OPENCLAW_INVALID_URL:${input || fallback}`);
  }

  return parsed.toString();
}

function extractOpenClawText(payload: unknown): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return "";
  const value = payload as any;
  if (typeof value.content === "string") return value.content;
  if (typeof value.text === "string") return value.text;
  if (value.delta) {
    if (typeof value.delta.content === "string") return value.delta.content;
    if (typeof value.delta.text === "string") return value.delta.text;
  }
  if (value.message) {
    const msg = value.message;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.map((c: any) => c?.text || c?.content || c?.value || "").join("");
    }
  }
  if (Array.isArray(value.content)) {
    return value.content.map((c: any) => c?.text || c?.content || c?.value || "").join("");
  }
  return "";
}

function mergeOpenClawStreamText(current: string, next: string): string {
  if (!next) return current;
  if (!current) return next;
  if (next === current) return current;
  if (next.startsWith(current)) return next;
  if (current.startsWith(next)) return current;
  if (next.includes(current)) return next;
  if (current.includes(next)) return current;
  const maxOverlap = Math.min(current.length, next.length);
  for (let i = maxOverlap; i > 0; i -= 1) {
    if (current.slice(-i) === next.slice(0, i)) {
      return current + next.slice(i);
    }
  }
  return current + next;
}

let openClawReqCounter = 0;

function nextOpenClawId(prefix = "shimeji") {
  openClawReqCounter = (openClawReqCounter + 1) % 1_000_000_000;
  return `${prefix}-${Date.now()}-${openClawReqCounter}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function buildOpenClawSessionKey(agentName: string) {
  const raw = String(agentName || "web-shimeji-1").toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 48) || "main";
  return `agent:${safe}:main`;
}

function resolveOllamaUrl(rawUrl: string): string {
  const fallback = "http://127.0.0.1:11434";
  const input = (rawUrl || fallback).trim();
  const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`OLLAMA_INVALID_URL:${input}`);
    }
    return parsed.origin;
  } catch {
    throw new Error(`OLLAMA_INVALID_URL:${input || fallback}`);
  }
}

export async function sendOllamaBrowserChat(args: {
  messages: ChatRequestMessage[];
  ollamaUrl: string;
  ollamaModel: string;
}): Promise<string> {
  const baseUrl = resolveOllamaUrl(args.ollamaUrl).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.ollamaModel || "gemma3:1b",
      messages: args.messages,
      stream: false,
    }),
  }).catch(() => {
    throw new Error(`OLLAMA_CONNECT:${baseUrl}`);
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 403) {
      throw new Error(`OLLAMA_FORBIDDEN:${baseUrl}`);
    }
    if (
      response.status === 404 ||
      text.toLowerCase().includes("not found") ||
      text.toLowerCase().includes("does not exist")
    ) {
      throw new Error(`MODEL_NOT_FOUND:${args.ollamaModel}`);
    }
    throw new Error(`OLLAMA_HTTP:${response.status}`);
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: { content?: string } }
    | null;
  const reply = data?.message?.content?.trim();
  if (!reply) throw new Error("OLLAMA_EMPTY_RESPONSE");
  return reply;
}

export async function sendOpenClawBrowserChat(args: {
  messages: ChatRequestMessage[];
  gatewayUrl: string;
  gatewayToken: string;
  agentName: string;
}): Promise<string> {
  if (typeof WebSocket !== "function") {
    throw new Error("OPENCLAW_WEBSOCKET_UNAVAILABLE");
  }
  const normalizedUrl = normalizeOpenClawGatewayUrl(args.gatewayUrl);
  const authToken = String(args.gatewayToken || "").trim();
  if (!authToken) throw new Error("OPENCLAW_MISSING_TOKEN");
  const messageText = getLastUserMessageText(args.messages);
  if (!messageText) throw new Error("OPENCLAW_EMPTY_MESSAGE");

  const sessionKey = buildOpenClawSessionKey(args.agentName);

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let settled = false;
    let authenticated = false;
    let chatRequestSent = false;
    let sawCompletion = false;
    let responseText = "";
    let idleTimer: number | null = null;

    const timeout = window.setTimeout(() => {
      fail(new Error(`OPENCLAW_TIMEOUT:${normalizedUrl}`));
    }, 70_000);

    const armIdleTimer = () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (sawCompletion && responseText) {
          finish(responseText);
          return;
        }
        fail(new Error(`OPENCLAW_IDLE_TIMEOUT:${normalizedUrl}`));
      }, 20_000);
    };

    const touchActivity = () => {
      armIdleTimer();
    };

    const finish = (result: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (ws && ws.readyState === ws.OPEN) ws.close(1000, "done");
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (ws && ws.readyState === ws.OPEN) ws.close(1011, "error");
      reject(error);
    };

    const pushText = (nextText: string) => {
      if (!nextText) return;
      responseText = mergeOpenClawStreamText(responseText, nextText);
    };

    try {
      ws = new WebSocket(normalizedUrl);
    } catch {
      fail(new Error(`OPENCLAW_CONNECT:${normalizedUrl}`));
      return;
    }

    ws.addEventListener("open", touchActivity);

    ws.addEventListener("message", (event) => {
      touchActivity();
      let data: any;
      try {
        const raw = typeof event.data === "string" ? event.data : "";
        if (!raw) return;
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (data.type === "event" && data.event === "connect.challenge") {
        const connectReq = {
          type: "req",
          id: nextOpenClawId("connect"),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: "gateway-client", version: "1.0.0", platform: "web", mode: "site" },
            role: "operator",
            scopes: ["operator.read", "operator.write"],
            auth: { token: authToken },
          },
        };
        ws?.send(JSON.stringify(connectReq));
        return;
      }

      if (data.type === "res" && !authenticated && data.ok === false) {
        const reason = data.error?.message || data.error?.code || "Authentication failed";
        fail(new Error(`OPENCLAW_AUTH_FAILED:${reason}`));
        return;
      }

      if (data.type === "res" && !authenticated && (data.payload?.type === "hello-ok" || data.ok === true)) {
        authenticated = true;
        if (!chatRequestSent) {
          chatRequestSent = true;
          ws?.send(
            JSON.stringify({
              type: "req",
              id: nextOpenClawId("chat"),
              method: "chat.send",
              params: {
                sessionKey,
                message: messageText,
                idempotencyKey: nextOpenClawId("idem"),
              },
            }),
          );
        }
        return;
      }

      if (data.type === "event") {
        const payload = data.payload || {};
        const text = extractOpenClawText(payload);
        if (text) pushText(text);
        if (
          payload.status === "completed" ||
          payload.status === "done" ||
          payload.type === "done" ||
          payload.done === true
        ) {
          sawCompletion = true;
          finish(responseText || text || "(no response)");
        }
        return;
      }

      if (data.type === "res" && authenticated && data.ok === true) {
        if (data.payload?.runId) return;
        const text = extractOpenClawText(data.payload);
        if (text) pushText(text);
        if (
          data.payload?.status === "completed" ||
          data.payload?.status === "done" ||
          data.payload?.done
        ) {
          sawCompletion = true;
          finish(responseText || text || "(no response)");
        }
        return;
      }

      if (data.type === "res" && authenticated && data.ok === false) {
        const reason = data.error?.message || data.error?.code || "Agent request failed";
        fail(new Error(`OPENCLAW_ERROR:${reason}`));
      }
    });

    ws.addEventListener("error", () => {
      fail(new Error(`OPENCLAW_CONNECT:${normalizedUrl}`));
    });

    ws.addEventListener("close", (event) => {
      if (settled) return;
      if (sawCompletion && responseText) {
        finish(responseText);
        return;
      }
      if (responseText) {
        fail(new Error(`OPENCLAW_INCOMPLETE_CLOSE:${event.code}`));
        return;
      }
      if (event.code === 1000 || event.code === 1001) {
        fail(new Error("OPENCLAW_EMPTY_RESPONSE"));
        return;
      }
      fail(new Error(`OPENCLAW_CLOSED:${event.code}`));
    });

    armIdleTimer();
  });
}

export function formatSiteShimejiProviderError(
  error: unknown,
  isSpanish: boolean,
  provider: "site" | "openrouter" | "ollama" | "openclaw",
): string {
  const message = String((error as Error)?.message || "UNKNOWN_ERROR");

  if (message.startsWith("NO_CREDITS")) {
    return isSpanish
      ? "Se terminaron los créditos gratis del sitio. Abre el ícono de engranaje y configura tu proveedor."
      : "The website free credits are exhausted. Open the gear icon and configure your own provider.";
  }
  if (message.startsWith("OLLAMA_CONNECT:")) {
    return isSpanish
      ? "No se pudo conectar a Ollama desde tu navegador."
      : "Could not connect to Ollama from your browser.";
  }
  if (message.startsWith("OLLAMA_FORBIDDEN:")) {
    return isSpanish
      ? "Ollama rechazó la solicitud (403). Revisa CORS/URL."
      : "Ollama rejected the request (403). Check CORS/URL.";
  }
  if (message.startsWith("MODEL_NOT_FOUND:")) {
    return isSpanish
      ? "El modelo configurado no existe en el proveedor."
      : "The configured model was not found on the provider.";
  }
  if (message.startsWith("OPENCLAW_INVALID_URL:")) {
    return isSpanish ? "La URL de OpenClaw no es válida." : "The OpenClaw URL is invalid.";
  }
  if (message.startsWith("OPENCLAW_MISSING_TOKEN")) {
    return isSpanish
      ? "Falta el token de OpenClaw. Configúralo en el panel."
      : "OpenClaw token is missing. Configure it in the panel.";
  }
  if (message.startsWith("OPENCLAW_AUTH_FAILED:")) {
    return isSpanish
      ? "Falló la autenticación con OpenClaw."
      : "OpenClaw authentication failed.";
  }
  if (message.startsWith("OPENCLAW_CONNECT:")) {
    return isSpanish
      ? "No se pudo conectar al gateway de OpenClaw desde tu navegador."
      : "Could not connect to the OpenClaw gateway from your browser.";
  }
  if (provider === "openrouter") {
    return isSpanish
      ? "No se pudo completar la solicitud con OpenRouter. Revisa tu key y modelo."
      : "Could not complete the OpenRouter request. Check your key and model.";
  }
  if (provider === "site") {
    return isSpanish
      ? "Ahora mismo no puedo responder con los créditos del sitio."
      : "I can't respond right now using site credits.";
  }
  return isSpanish
    ? "No pude responder con el proveedor configurado."
    : "I couldn't respond using the configured provider.";
}

export type SiteShimejiClientHistoryMessage = SiteShimejiChatMessage;

