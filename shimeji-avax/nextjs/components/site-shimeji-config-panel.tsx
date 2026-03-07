"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSiteShimeji } from "@/components/site-shimeji-provider";
import { getSiteShimejiPersonalityDisplayLabel } from "@/lib/site-shimeji-personality-labels";
import {
  SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX,
  SITE_SHIMEJI_CHAT_FONT_SIZE_MAP,
  SITE_SHIMEJI_CHAT_THEMES,
  SITE_SHIMEJI_CHAT_WIDTH_MAP,
  pickRandomSiteShimejiChatTheme,
} from "@/lib/site-shimeji-chat-ui";

type ConfigPanelTab = "chat" | "appearance" | "mascot" | "sound";

type OpenRouterModelOption = {
  value: string;
  labelEn: string;
  labelEs: string;
  disabled?: boolean;
};

const OPENROUTER_MODEL_OPTIONS: readonly OpenRouterModelOption[] = [
  { value: "random", labelEn: "Random", labelEs: "Aleatorio" },
  { value: "google/gemini-2.0-flash-001", labelEn: "Gemini 2.0 Flash", labelEs: "Gemini 2.0 Flash" },
  {
    value: "moonshotai/kimi-k2.5",
    labelEn: "Kimi K2.5 (disabled)",
    labelEs: "Kimi K2.5 (deshabilitado)",
    disabled: true,
  },
  { value: "anthropic/claude-sonnet-4", labelEn: "Claude Sonnet 4", labelEs: "Claude Sonnet 4" },
  { value: "meta-llama/llama-4-maverick", labelEn: "Llama 4 Maverick", labelEs: "Llama 4 Maverick" },
  { value: "deepseek/deepseek-chat-v3-0324", labelEn: "DeepSeek Chat v3", labelEs: "DeepSeek Chat v3" },
  { value: "mistralai/mistral-large-2411", labelEn: "Mistral Large", labelEs: "Mistral Large" },
];

function ChatAppearanceFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();

  const matchedPreset = useMemo(
    () =>
      SITE_SHIMEJI_CHAT_THEMES.find(
        (theme) =>
          theme.theme.toLowerCase() === config.chatThemeColor.toLowerCase() &&
          theme.bg.toLowerCase() === config.chatBgColor.toLowerCase() &&
          theme.bubble === config.chatBubbleStyle,
      ) ?? null,
    [config.chatBgColor, config.chatBubbleStyle, config.chatThemeColor],
  );

  const activeThemeChip = config.chatThemePreset === "random" ? "random" : matchedPreset?.id ?? "custom";
  const hasManualSize =
    config.chatWidthPx !== null || config.chatHeightPx !== SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX;

  function applyThemePreset(presetId: string) {
    if (presetId === "custom") {
      updateConfig({ chatThemePreset: "custom" });
      return;
    }

    if (presetId === "random") {
      const randomPreset = pickRandomSiteShimejiChatTheme();
      updateConfig({
        chatThemePreset: "random",
        chatThemeColor: randomPreset.theme,
        chatBgColor: randomPreset.bg,
        chatBubbleStyle: randomPreset.bubble,
      });
      return;
    }

    const preset = SITE_SHIMEJI_CHAT_THEMES.find((theme) => theme.id === presetId);
    if (!preset) return;
    updateConfig({
      chatThemePreset: preset.id,
      chatThemeColor: preset.theme,
      chatBgColor: preset.bg,
      chatBubbleStyle: preset.bubble,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        {isSpanish
          ? "La burbuja puede redimensionarse con el mouse desde los bordes (izquierdo/derecho y superior) cuando está abierta."
          : "The chat bubble can be resized with the mouse from its edges (left/right and top) while it is open."}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Tema del chat" : "Chat theme"}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyThemePreset("custom")}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold ${
              activeThemeChip === "custom"
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
            }`}
            title={isSpanish ? "Tema personalizado" : "Custom theme"}
          >
            🎨
          </button>
          <button
            type="button"
            onClick={() => applyThemePreset("random")}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold ${
              activeThemeChip === "random"
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
            }`}
            title={isSpanish ? "Tema aleatorio" : "Random theme"}
          >
            🎲
          </button>

          {SITE_SHIMEJI_CHAT_THEMES.map((theme) => {
            const isActive = activeThemeChip === theme.id;
            const title = isSpanish ? theme.labelEs : theme.labelEn;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyThemePreset(theme.id)}
                className={`relative h-9 w-9 rounded-full border p-1 transition ${
                  isActive
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                title={title}
                aria-label={title}
              >
                <span
                  className="flex h-full w-full items-center justify-center rounded-full border border-black/15"
                  style={{ background: theme.bg }}
                >
                  <span
                    className="block h-1/2 w-1/2 rounded-full border border-black/15"
                    style={{ background: theme.theme }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Color acento" : "Accent color"}
            </span>
            <input
              type="color"
              value={config.chatThemeColor}
              onChange={(event) =>
                updateConfig({
                  chatThemePreset: "custom",
                  chatThemeColor: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-black/30 p-1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Color fondo" : "Background color"}
            </span>
            <input
              type="color"
              value={config.chatBgColor}
              onChange={(event) =>
                updateConfig({
                  chatThemePreset: "custom",
                  chatBgColor: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-white/15 bg-black/30 p-1"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Estilo de burbuja" : "Bubble style"}
          </span>
          <select
            value={config.chatBubbleStyle}
            onChange={(event) =>
              updateConfig({
                chatThemePreset: "custom",
                chatBubbleStyle: event.target.value as "glass" | "solid" | "dark",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="glass">{isSpanish ? "Glass (transparente)" : "Glass (transparent)"}</option>
            <option value="solid">{isSpanish ? "Solid (sólido)" : "Solid"}</option>
            <option value="dark">{isSpanish ? "Dark (oscuro)" : "Dark"}</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Texto" : "Text size"}
            </span>
            <select
              value={config.chatFontSize}
              onChange={(event) =>
                updateConfig({ chatFontSize: event.target.value as "small" | "medium" | "large" })
              }
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="small">
                {isSpanish ? "Pequeño" : "Small"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.small}px)
              </option>
              <option value="medium">
                {isSpanish ? "Medio" : "Medium"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.medium}px)
              </option>
              <option value="large">
                {isSpanish ? "Grande" : "Large"} ({SITE_SHIMEJI_CHAT_FONT_SIZE_MAP.large}px)
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Ancho base" : "Base width"}
            </span>
            <select
              value={config.chatWidth}
              onChange={(event) =>
                updateConfig({ chatWidth: event.target.value as "small" | "medium" | "large" })
              }
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="small">
                {isSpanish ? "Pequeño" : "Small"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.small}px)
              </option>
              <option value="medium">
                {isSpanish ? "Medio" : "Medium"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.medium}px)
              </option>
              <option value="large">
                {isSpanish ? "Grande" : "Large"} ({SITE_SHIMEJI_CHAT_WIDTH_MAP.large}px)
              </option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              updateConfig({
                chatWidthPx: null,
                chatHeightPx: SITE_SHIMEJI_CHAT_DEFAULT_HEIGHT_PX,
              })
            }
            disabled={!hasManualSize}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSpanish ? "Restablecer tamaño manual" : "Reset manual size"}
          </button>
          <span className="text-muted-foreground">
            {isSpanish
              ? `Actual: ${config.chatWidthPx ?? SITE_SHIMEJI_CHAT_WIDTH_MAP[config.chatWidth]}×${config.chatHeightPx}px`
              : `Current: ${config.chatWidthPx ?? SITE_SHIMEJI_CHAT_WIDTH_MAP[config.chatWidth]}×${config.chatHeightPx}px`}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProviderFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig, freeSiteMessagesRemaining, freeSiteMessagesUsed } = useSiteShimeji();
  const openRouterModelKnown = OPENROUTER_MODEL_OPTIONS.some((item) => item.value === config.openrouterModel);
  const openRouterModelSelectValue = openRouterModelKnown ? config.openrouterModel : "__custom__";
  const [pairingCode, setPairingCode] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingInstructionBusy, setPairingInstructionBusy] = useState(false);
  const [pairingInstructionStatus, setPairingInstructionStatus] = useState("");
  const [pairingStatus, setPairingStatus] = useState("");
  const [openclawAgentNameEnabled, setOpenclawAgentNameEnabled] = useState(false);
  const [openclawCustomAgentName, setOpenclawCustomAgentName] = useState("main");

  const hasPairedSession = Boolean(config.openclawPairedSessionToken.trim());
  const pairedSessionExpiresAtMs = config.openclawPairedSessionExpiresAt
    ? Date.parse(config.openclawPairedSessionExpiresAt)
    : NaN;
  const pairedSessionExpired = Number.isFinite(pairedSessionExpiresAtMs) && pairedSessionExpiresAtMs <= Date.now();
  const pairingInstructionStatusLower = pairingInstructionStatus.toLowerCase();
  const pairingInstructionStatusIsError =
    pairingInstructionStatusLower.includes("error") ||
    pairingInstructionStatusLower.includes("failed") ||
    pairingInstructionStatusLower.includes("invalid") ||
    pairingInstructionStatusLower.includes("could not") ||
    pairingInstructionStatusLower.includes("no se pudo");
  const pairingStatusLower = pairingStatus.toLowerCase();
  const pairingStatusIsError =
    pairingStatusLower.includes("error") ||
    pairingStatusLower.includes("failed") ||
    pairingStatusLower.includes("invalid") ||
    pairingStatusLower.includes("venció") ||
    pairingStatusLower.includes("vencio") ||
    pairingStatusLower.includes("could not") ||
    pairingStatusLower.includes("no se pudo");
  const pairingRequestEndpoint =
    typeof window === "undefined"
      ? "https://shimeji.dev/api/site-shimeji/openclaw/pairings/request"
      : `${window.location.origin}/api/site-shimeji/openclaw/pairings/request`;
  const relayRegisterUrl =
    typeof window === "undefined"
      ? "https://shimeji.dev/api/site-shimeji/openclaw/relay/register"
      : `${window.location.origin}/api/site-shimeji/openclaw/relay/register`;
  const relayPollUrl =
    typeof window === "undefined"
      ? "https://shimeji.dev/api/site-shimeji/openclaw/relay/poll"
      : `${window.location.origin}/api/site-shimeji/openclaw/relay/poll`;
  const relayRespondUrl =
    typeof window === "undefined"
      ? "https://shimeji.dev/api/site-shimeji/openclaw/relay/respond"
      : `${window.location.origin}/api/site-shimeji/openclaw/relay/respond`;

  function providerHelpLinks(kind: "openrouter" | "ollama" | "openclaw") {
    if (kind === "openrouter") {
      return (
        <a
          href="https://openrouter.ai/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
        >
          {isSpanish ? "Conseguir API key de OpenRouter" : "Get OpenRouter API key"}
        </a>
      );
    }
    if (kind === "ollama") {
      return (
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
        >
          {isSpanish ? "Descargar / configurar Ollama" : "Download / setup Ollama"}
        </a>
      );
    }
    return (
      <a
        href="https://github.com/openclaw/openclaw"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
      >
        {isSpanish ? "Configurar OpenClaw" : "Setup OpenClaw"}
      </a>
    );
  }

  async function claimOpenClawPairing() {
    const code = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (!code) {
      setPairingStatus(
        isSpanish ? "Ingresá un código de pairing válido." : "Enter a valid pairing code.",
      );
      return;
    }

    setPairingBusy(true);
    setPairingStatus("");
    try {
      const response = await fetch("/api/site-shimeji/openclaw/pairings/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await response.json().catch(() => null)) as
        | {
            error?: string;
            sessionToken?: string;
            sessionExpiresAt?: string;
            agentName?: string;
          }
        | null;

      if (!response.ok || !json?.sessionToken) {
        const err = json?.error || "OPENCLAW_PAIRING_CLAIM_FAILED";
        if (err === "OPENCLAW_PAIRING_CODE_EXPIRED") {
          throw new Error(
            isSpanish
              ? "Ese código de pairing venció. Pedí uno nuevo."
              : "That pairing code has expired. Request a new one.",
          );
        }
        if (err === "OPENCLAW_PAIRING_CODE_USED") {
          throw new Error(
            isSpanish
              ? "Ese código ya fue usado. Pedí uno nuevo."
              : "That pairing code was already used. Request a new one.",
          );
        }
        if (err === "OPENCLAW_PAIRING_INVALID_CODE") {
          throw new Error(
            isSpanish
              ? "Código inválido. Revisalo e intentá de nuevo."
              : "Invalid pairing code. Check it and try again.",
          );
        }
        if (err === "OPENCLAW_RELAY_SCOPE_REQUIRED") {
          throw new Error(
            isSpanish
              ? "El token del gateway no tiene permiso operator.write. Configurá un token con ese scope y generá un nuevo pairing code."
              : "Gateway token is missing operator.write scope. Configure a token with that scope and generate a new pairing code.",
          );
        }
        if (err === "OPENCLAW_RELAY_UNAVAILABLE") {
          throw new Error(
            isSpanish
              ? "El relay del agente no respondió durante la verificación inicial. Reintentá generar el pairing code con el agente online."
              : "The agent relay did not respond during initial verification. Retry generating the pairing code with the agent online.",
          );
        }
        throw new Error(
          isSpanish
            ? "No se pudo completar el pairing ahora."
            : "Could not complete pairing right now.",
        );
      }

      updateConfig({
        openclawMode: "paired",
        openclawPairedSessionToken: json.sessionToken,
        openclawPairedSessionExpiresAt: json.sessionExpiresAt || "",
        openclawPairedAgentName: json.agentName || "",
      });
      setPairingCode("");
      setPairingStatus(
        isSpanish
          ? "OpenClaw vinculado correctamente."
          : "OpenClaw paired successfully.",
      );
    } catch (error) {
      setPairingStatus(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "Error al vincular OpenClaw."
            : "Failed to pair OpenClaw.",
      );
    } finally {
      setPairingBusy(false);
    }
  }

  function clearPairedSession() {
    updateConfig({
      openclawPairedSessionToken: "",
      openclawPairedSessionExpiresAt: "",
      openclawPairedAgentName: "",
    });
    setPairingStatus(
      isSpanish ? "Sesión de OpenClaw desconectada." : "OpenClaw session disconnected.",
    );
  }

  function relayNodeScript(): string {
    return `'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

const [,, REQUEST_CODE, AGENT_NAME, REGISTER_URL, POLL_URL, RESPOND_URL] = process.argv;
if (!REQUEST_CODE || !REGISTER_URL || !POLL_URL || !RESPOND_URL) {
  process.stderr.write('Missing args\\n');
  process.exit(1);
}

let GATEWAY_TOKEN;
let GATEWAY_URL = 'ws://127.0.0.1:18789';
try {
  const cfgPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const envToken = typeof process.env.OPENCLAW_GATEWAY_TOKEN === 'string'
    ? process.env.OPENCLAW_GATEWAY_TOKEN.trim()
    : '';
  const cfgToken = cfg && cfg.gateway && cfg.gateway.auth && cfg.gateway.auth.token;
  const cfgOperatorToken = cfg && cfg.gateway && cfg.gateway.auth && cfg.gateway.auth.operatorToken;
  const cfgWriteToken = cfg && cfg.gateway && cfg.gateway.auth && cfg.gateway.auth.writeToken;
  const cfgAdminToken = cfg && cfg.gateway && cfg.gateway.auth && cfg.gateway.auth.adminToken;
  const cfgTopToken = cfg && cfg.gateway && cfg.gateway.token;
  GATEWAY_TOKEN =
    envToken ||
    cfgOperatorToken ||
    cfgWriteToken ||
    cfgAdminToken ||
    cfgToken ||
    cfgTopToken;
  const configuredUrl = cfg && cfg.gateway && cfg.gateway.url;
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    GATEWAY_URL = configuredUrl.trim();
  }
  if (!GATEWAY_TOKEN) {
    throw new Error('gateway token not found (set OPENCLAW_GATEWAY_TOKEN or gateway.auth.token)');
  }
} catch (e) {
  process.stderr.write('Cannot read gateway token: ' + e.message + '\\n');
  process.exit(1);
}

function normalizeGatewayUrl(value) {
  const input = String(value || '').trim();
  const withScheme = /^[a-z]+:\/\//i.test(input) ? input : ('ws://' + input);
  let u;
  try { u = new URL(withScheme); }
  catch (_) { throw new Error('Invalid gateway.url: ' + input); }
  if (u.protocol === 'http:') u.protocol = 'ws:';
  if (u.protocol === 'https:') u.protocol = 'wss:';
  if (u.protocol !== 'ws:' && u.protocol !== 'wss:') {
    throw new Error('Invalid gateway.url protocol: ' + input);
  }
  return u.toString();
}

try {
  GATEWAY_URL = normalizeGatewayUrl(GATEWAY_URL);
} catch (e) {
  process.stderr.write(String(e && e.message ? e.message : e) + '\\n');
  process.exit(1);
}

function post(url, body) {
  return new Promise(function(resolve, reject) {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const opts = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80')),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = mod.request(opts, function(res) {
      let raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (_) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function buildSessionKey(agentName) {
  const raw = String(agentName || 'main').toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 48) || 'main';
  return 'agent:' + safe + ':main';
}

function getLastUserMsg(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

function extractText(p) {
  if (!p) return '';
  if (typeof p.content === 'string') return p.content;
  if (typeof p.text === 'string') return p.text;
  if (p.delta) {
    if (typeof p.delta.content === 'string') return p.delta.content;
    if (typeof p.delta.text === 'string') return p.delta.text;
  }
  if (p.data && typeof p.data.text === 'string') return p.data.text;
  return '';
}

function mergeText(cur, next) {
  if (!next) return cur;
  if (!cur) return next;
  if (next === cur || cur.startsWith(next)) return cur;
  if (next.startsWith(cur)) return next;
  const max = Math.min(cur.length, next.length);
  for (let i = max; i > 0; i--) {
    if (cur.slice(-i) === next.slice(0, i)) return cur + next.slice(i);
  }
  return cur + next;
}

function hasMissingWriteScope(msg) {
  const s = String(msg || '').toLowerCase();
  return s.includes('missing scope') && s.includes('operator.write');
}

function assertOperatorWrite(agentName) {
  return new Promise(function(resolve, reject) {
    let settled = false, authed = false, probeSent = false, reqN = 0;
    const nextId = function(p) { return p + '-' + Date.now() + '-' + (++reqN); };
    let ws;
    const timer = setTimeout(function() { fail('PRECHECK_TIMEOUT'); }, 12000);

    function cleanup() {
      clearTimeout(timer);
      try { if (ws) ws.close(1000); } catch (_) {}
    }

    function ok() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function fail(msg) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(String(msg || 'PRECHECK_FAILED').slice(0, 240)));
    }

    try { ws = new WebSocket(GATEWAY_URL); } catch (_) { fail('WS_CONNECT_FAILED'); return; }
    ws.onerror = function() { fail('WS_ERROR'); };
    ws.onclose = function(ev) { if (!settled) fail('WS_CLOSED:' + (ev && ev.code ? ev.code : 'unknown')); };
    ws.onmessage = function(ev) {
      let d;
      try { d = JSON.parse(ev.data); } catch (_) { return; }

      if (d.type === 'event' && d.event === 'connect.challenge') {
        ws.send(JSON.stringify({ type: 'req', id: nextId('c'), method: 'connect', params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: 'gateway-client', version: '1.0.0', platform: 'server', mode: 'backend' },
          role: 'operator', scopes: ['operator.read', 'operator.write'],
          auth: { token: GATEWAY_TOKEN },
        }}));
        return;
      }

      if (d.type === 'res' && !authed && d.ok === false) {
        const reason = (d.error && (d.error.message || d.error.code)) || 'AUTH_FAILED';
        fail('AUTH_FAILED:' + reason);
        return;
      }

      if (d.type === 'res' && !authed && (d.ok === true || (d.payload && d.payload.type === 'hello-ok'))) {
        authed = true;
        const grantedScopes = Array.isArray(d.payload && d.payload.scopes) ? d.payload.scopes.map(function(x) {
          return String(x || '').toLowerCase();
        }) : [];
        if (grantedScopes.length && grantedScopes.indexOf('operator.write') === -1) {
          fail('REQUEST_FAILED:missing scope: operator.write');
          return;
        }

        probeSent = true;
        ws.send(JSON.stringify({ type: 'req', id: nextId('scope'), method: 'chat.send', params: {
          sessionKey: buildSessionKey(agentName),
          message: '[shimeji relay preflight]',
          idempotencyKey: nextId('idem'),
        }}));
        return;
      }

      if (authed && probeSent && d.type === 'res' && d.ok === false) {
        const reason = (d.error && (d.error.message || d.error.code)) || 'REQUEST_FAILED';
        if (hasMissingWriteScope(reason)) {
          fail('REQUEST_FAILED:missing scope: operator.write');
          return;
        }
        fail('REQUEST_FAILED:' + reason);
        return;
      }

      if (authed && probeSent && ((d.type === 'res' && d.ok === true) || d.type === 'event')) {
        ok();
      }
    };
  });
}

function relayChat(messages, agentName) {
  return new Promise(function(resolve) {
    const sessionKey = buildSessionKey(agentName);
    const msgText = getLastUserMsg(messages);
    let settled = false, authed = false, chatSent = false, responseText = '', sawDone = false;
    let idleTimer = null, globalTimer = null, reqN = 0;
    const nextId = function(p) { return p + '-' + Date.now() + '-' + (++reqN); };
    const relayError = function(msg) {
      return '__OPENCLAW_ERROR__:' + String(msg || 'unknown').slice(0, 220);
    };

    function done(text) {
      if (settled) return;
      settled = true;
      clearTimeout(idleTimer);
      clearTimeout(globalTimer);
      try { ws.close(1000); } catch (_) {}
      resolve(text || '(no response)');
    }

    function arm() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function() { done(responseText || relayError('IDLE_TIMEOUT')); }, 20000);
    }

    globalTimer = setTimeout(function() { done(responseText || relayError('GLOBAL_TIMEOUT')); }, 70000);

    const ws = new WebSocket(GATEWAY_URL);
    ws.onopen = function() { arm(); };
    ws.onerror = function() { done(responseText || relayError('WS_ERROR')); };
    ws.onclose = function() { if (!settled) done(responseText || relayError('WS_CLOSED')); };
    ws.onmessage = function(ev) {
      let d;
      try { d = JSON.parse(ev.data); } catch (_) { return; }

      if (d.type === 'event' && d.event === 'connect.challenge') {
        arm();
        ws.send(JSON.stringify({ type: 'req', id: nextId('c'), method: 'connect', params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: 'gateway-client', version: '1.0.0', platform: 'server', mode: 'backend' },
          role: 'operator', scopes: ['operator.read', 'operator.write'],
          auth: { token: GATEWAY_TOKEN },
        }}));
        return;
      }
      if (d.type === 'res' && !authed && d.ok === false) {
        const authErr = (d.error && (d.error.message || d.error.code)) || 'AUTH_FAILED';
        done(responseText || relayError('AUTH_FAILED:' + authErr));
        return;
      }
      if (d.type === 'res' && !authed && (d.ok === true || (d.payload && d.payload.type === 'hello-ok'))) {
        arm(); authed = true;
        if (!chatSent) {
          chatSent = true;
          ws.send(JSON.stringify({ type: 'req', id: nextId('chat'), method: 'chat.send', params: {
            sessionKey: sessionKey, message: msgText, idempotencyKey: nextId('idem'),
          }}));
        }
        return;
      }
      if (d.type === 'event') {
        const p = d.payload || {};
        const t = extractText(p);
        if (t) responseText = mergeText(responseText, t);
        if (p.state !== undefined || p.status !== undefined || p.done !== undefined) arm();
        if (p.state === 'error') {
          const agentErr = p.errorMessage || p.error || 'AGENT_ERROR';
          done(responseText || relayError('AGENT_ERROR:' + agentErr));
          return;
        }
        if (p.state === 'final' || p.status === 'completed' || p.done === true) {
          sawDone = true; done(responseText || t || '(no response)');
        }
        return;
      }
      if (d.type === 'res' && authed && d.ok === true) {
        if (d.payload && d.payload.runId) { arm(); return; }
        const t = extractText(d.payload);
        if (t) responseText = mergeText(responseText, t);
        if (d.payload && (d.payload.state === 'final' || d.payload.status === 'completed' || d.payload.done)) {
          sawDone = true; done(responseText || t || '(no response)');
        }
        return;
      }
      if (d.type === 'res' && authed && d.ok === false) {
        const reqErr = (d.error && (d.error.message || d.error.code)) || 'REQUEST_FAILED';
        done(responseText || relayError('REQUEST_FAILED:' + reqErr));
      }
    };
    arm();
  });
}

function detectAgentName() {
  return new Promise(function(resolve) {
    let settled = false;
    const timer = setTimeout(function() { if (!settled) { settled = true; resolve('main'); } }, 5000);
    let ws2;
    try { ws2 = new WebSocket(GATEWAY_URL); } catch(_) { clearTimeout(timer); resolve('main'); return; }
    let authed2 = false;
    ws2.onerror = function() { if (!settled) { settled = true; clearTimeout(timer); resolve('main'); } };
    ws2.onclose = function() { if (!settled) { settled = true; clearTimeout(timer); resolve('main'); } };
    ws2.onmessage = function(ev) {
      let d2;
      try { d2 = JSON.parse(ev.data); } catch(_) { return; }
      if (d2.type === 'event' && d2.event === 'connect.challenge') {
        ws2.send(JSON.stringify({ type: 'req', id: 'dc', method: 'connect', params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: 'gateway-client', version: '1.0.0', platform: 'server', mode: 'backend' },
          role: 'operator', scopes: ['operator.read', 'operator.write'],
          auth: { token: GATEWAY_TOKEN },
        }}));
      } else if (!authed2 && d2.type === 'res' && d2.ok === true && d2.payload && d2.payload.type === 'hello-ok') {
        authed2 = true;
        ws2.send(JSON.stringify({ type: 'req', id: 'dal', method: 'agents.list', params: {} }));
      } else if (d2.id === 'dal') {
        const name = (d2.payload && d2.payload.defaultId) || 'main';
        if (!settled) { settled = true; clearTimeout(timer); try { ws2.close(1000); } catch(_) {} resolve(name); }
      }
    };
  });
}

async function main() {
  const agentName = AGENT_NAME || await detectAgentName();
  try {
    await assertOperatorWrite(agentName);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (hasMissingWriteScope(msg)) {
      process.stderr.write('Gateway token is missing required scope operator.write. Set OPENCLAW_GATEWAY_TOKEN (with operator.write) and rerun.\\n');
    } else {
      process.stderr.write('Gateway precheck failed: ' + msg + '\\n');
    }
    process.exit(1);
  }

  const reg = await post(REGISTER_URL, { requestCode: REQUEST_CODE, agentName: agentName });
  if (!reg.body || !reg.body.pairingCode || !reg.body.relayToken) {
    process.stderr.write('Registration failed: ' + JSON.stringify(reg.body) + '\\n');
    process.exit(1);
  }
  const pairingCode = reg.body.pairingCode;
  const relayToken = reg.body.relayToken;
  process.stdout.write(pairingCode + '\\n');

  while (true) {
    try {
      const poll = await post(POLL_URL, { relayToken: relayToken });
      if (!poll.body || !poll.body.jobId) continue;
      const jobId = poll.body.jobId;
      const messages = poll.body.messages || [];
      const jobAgentName = poll.body.agentName || agentName;
      const response = await relayChat(messages, jobAgentName);
      await post(RESPOND_URL, { relayToken: relayToken, jobId: jobId, response: response });
    } catch (e) {
      process.stderr.write('Relay error: ' + e.message + '\\n');
    }
  }
}

main().catch(function(e) {
  process.stderr.write('Fatal: ' + e.message + '\\n');
  process.exit(1);
});`;
  }

  function pairingMarkdownInstructions(args: { requestCode: string; requestExpiresAt: string; customAgentName?: string }) {
    const { requestCode, requestExpiresAt, customAgentName } = args;
    const nodeScript = relayNodeScript();
    const agentNameLine = customAgentName?.trim()
      ? `AGENT_NAME="${customAgentName.trim()}"  # override: custom agent name`
      : `AGENT_NAME="\${OPENCLAW_AGENT_NAME:-}"  # empty = auto-detect from gateway`;
    const bashScript = `set -euo pipefail
REQUEST_CODE="${requestCode}"
${agentNameLine}
RELAY_LOG="$(mktemp /tmp/openclaw-relay-XXXXXX.log)"
RELAY_SCRIPT="$(mktemp /tmp/openclaw-relay-XXXXXX.cjs)"
cat > "$RELAY_SCRIPT" << 'RELAY_EOF'
${nodeScript}
RELAY_EOF
nohup node "$RELAY_SCRIPT" "$REQUEST_CODE" "$AGENT_NAME" "${relayRegisterUrl}" "${relayPollUrl}" "${relayRespondUrl}" > "$RELAY_LOG" 2>&1 &
disown
CODE=""
for i in $(seq 1 30); do
  CODE="$(grep -m1 -E '^[A-Z0-9]{6,12}$' "$RELAY_LOG" 2>/dev/null || true)"
  [ -n "$CODE" ] && break
  sleep 1
done
[ -n "$CODE" ] || { echo "ERROR: No pairing code received. Check $RELAY_LOG" >&2; exit 1; }
echo "$CODE"`;
    return `# Task: Generate pairing code for web user (relay mode)

Run the script below in your shell. It will print a pairing code. Return ONLY that code to the user (example: \`Q7M4K9P2\`). Do not add explanations.

## How it works
Your local OpenClaw gateway connects outward to the relay server — no public URL needed. No openclaw CLI required. Config is read automatically from \`~/.openclaw/openclaw.json\`.

## Requirement
The gateway token must allow \`operator.write\` (chat/send permission).
If needed, set \`OPENCLAW_GATEWAY_TOKEN\` to a token with that scope before running.

## One-time request code
${requestCode}
Expires: ${requestExpiresAt}

## Script
\`\`\`bash
${bashScript}
\`\`\`

## Security rule
Do not print the relay token or gateway token in your final reply. Return only the pairing code.`;
  }

  async function copyToClipboard(value: string): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  async function copyPairingAgentInstructions() {
    setPairingInstructionBusy(true);
    setPairingInstructionStatus("");
    try {
      const response = await fetch(pairingRequestEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlSeconds: 15 * 60 }),
      });
      const json = (await response.json().catch(() => null)) as
        | { requestCode?: string; expiresAt?: string; error?: string }
        | null;

      if (!response.ok || !json?.requestCode || !json?.expiresAt) {
        throw new Error(
          isSpanish
            ? "No se pudo generar un código temporal para instrucciones."
            : "Could not generate a temporary instruction code.",
        );
      }

      const instructions = pairingMarkdownInstructions({
        requestCode: json.requestCode,
        requestExpiresAt: json.expiresAt,
        customAgentName: openclawAgentNameEnabled ? openclawCustomAgentName : undefined,
      });
      const copied = await copyToClipboard(instructions);
      if (!copied) {
        throw new Error(
          isSpanish
            ? "No se pudo copiar automáticamente. Copialo manualmente."
            : "Could not copy automatically. Please copy it manually.",
        );
      }

      setPairingInstructionStatus(
        isSpanish
          ? `Instrucciones copiadas. El request code vence ${new Date(json.expiresAt).toLocaleString()}.`
          : `Instructions copied. Request code expires ${new Date(json.expiresAt).toLocaleString()}.`,
      );
    } catch (error) {
      setPairingInstructionStatus(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "No se pudieron preparar las instrucciones de pairing."
            : "Could not prepare pairing instructions.",
      );
    } finally {
      setPairingInstructionBusy(false);
    }
  }

  if (config.provider === "site") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-foreground/80">
        <p className="font-semibold text-foreground">
          {isSpanish ? "Créditos gratis del sitio" : "Site free credits"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isSpanish
            ? `Usados: ${freeSiteMessagesUsed}. Restantes: ${freeSiteMessagesRemaining ?? 0}.`
            : `Used: ${freeSiteMessagesUsed}. Remaining: ${freeSiteMessagesRemaining ?? 0}.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {isSpanish
            ? "Cuando se terminen, cambia a OpenRouter, Ollama u OpenClaw para seguir hablando."
            : "When these run out, switch to OpenRouter, Ollama, or OpenClaw to keep chatting."}
        </p>
      </div>
    );
  }

  if (config.provider === "openrouter") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {providerHelpLinks("openrouter")}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            OpenRouter API Key
          </span>
          <input
            type="password"
            value={config.openrouterApiKey}
            onChange={(event) => updateConfig({ openrouterApiKey: event.target.value })}
            placeholder="sk-or-v1-..."
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <select
            value={openRouterModelSelectValue}
            onChange={(event) =>
              updateConfig({
                openrouterModel:
                  event.target.value === "__custom__" ? (openRouterModelKnown ? "" : config.openrouterModel) : event.target.value,
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            {OPENROUTER_MODEL_OPTIONS.map((item) => (
              <option key={item.value} value={item.value} disabled={Boolean(item.disabled)}>
                {isSpanish ? item.labelEs : item.labelEn}
              </option>
            ))}
            <option value="__custom__">{isSpanish ? "Personalizado" : "Custom"}</option>
          </select>
        </label>
        {openRouterModelSelectValue === "__custom__" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Modelo personalizado" : "Custom model"}
            </span>
            <input
              type="text"
              value={config.openrouterModel}
              onChange={(event) => updateConfig({ openrouterModel: event.target.value })}
              placeholder="openai/gpt-4o-mini"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            />
          </label>
        ) : null}
      </div>
    );
  }

  if (config.provider === "ollama") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {providerHelpLinks("ollama")}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ollama URL
          </span>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(event) => updateConfig({ ollamaUrl: event.target.value })}
            placeholder="http://127.0.0.1:11434"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Modelo" : "Model"}
          </span>
          <input
            type="text"
            value={config.ollamaModel}
            onChange={(event) => updateConfig({ ollamaModel: event.target.value })}
            placeholder="gemma3:1b"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {isSpanish
            ? "Se intenta conectar directo desde tu navegador. Si tu navegador bloquea la conexión local, usa una URL accesible por HTTPS o un túnel."
            : "The site tries to connect directly from your browser. If your browser blocks local connections, use an HTTPS-accessible URL or tunnel."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {providerHelpLinks("openclaw")}
      </div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            {isSpanish
              ? "¿De dónde sale el código de pairing?"
              : "Where does the pairing code come from?"}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>
              {isSpanish
                ? "Copiá las instrucciones y pegáselas a tu agente OpenClaw."
                : "Copy the instructions and paste them into your OpenClaw agent."}
            </li>
            <li>
              {isSpanish
                ? "El agente ejecuta el script: lee tu config local e imprime un código."
                : "The agent runs the script: it reads your local config and prints a code."}
            </li>
            <li>
              {isSpanish
                ? "Pegá ese código acá y presioná Vincular."
                : "Paste that code here and press Pair."}
            </li>
          </ol>
          <p className="mt-2">
            {isSpanish
              ? "Tu gateway conecta hacia afuera — no necesitás URL pública ni instalar nada extra."
              : "Your gateway connects outward — no public URL or extra install needed."}
          </p>
          <div className="mt-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={openclawAgentNameEnabled}
                onChange={(e) => setOpenclawAgentNameEnabled(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--brand-accent)]"
              />
              <span className="text-[11px] text-muted-foreground">
                {isSpanish ? "Nombre de agente personalizado" : "Custom agent name"}
              </span>
            </label>
            <input
              type="text"
              disabled={!openclawAgentNameEnabled}
              value={openclawAgentNameEnabled ? openclawCustomAgentName : ""}
              placeholder={openclawAgentNameEnabled
                ? (isSpanish ? "ej: main" : "e.g. main")
                : (isSpanish ? "Auto-detectar desde gateway" : "Auto-detect from gateway")}
              onChange={(e) =>
                setOpenclawCustomAgentName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48))
              }
              className={`mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] text-foreground outline-none focus:border-[var(--brand-accent)] ${
                !openclawAgentNameEnabled ? "cursor-not-allowed opacity-40" : ""
              }`}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyPairingAgentInstructions()}
              disabled={pairingInstructionBusy}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pairingInstructionBusy
                ? isSpanish
                  ? "Preparando..."
                  : "Preparing..."
                : isSpanish
                  ? "Copiar instrucciones para agente"
                  : "Copy agent instructions"}
            </button>
            {pairingInstructionStatus ? (
              <p
                className={`inline-flex w-fit max-w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                  pairingInstructionStatusIsError
                    ? "border-red-700 bg-red-300 text-black"
                    : "border-green-700 bg-green-300 text-black"
                }`}
              >
                {pairingInstructionStatus}
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {isSpanish ? "Referencia manual:" : "Manual reference:"}{" "}
            <a
              href="/openclaw-pairing-agent-template.md"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground underline underline-offset-2"
            >
              openclaw-pairing-agent-template.md
            </a>
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Código de pairing (uso único)" : "Pairing code (one-time use)"}
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
              placeholder={isSpanish ? "Ej: Q7M4K9P2" : "Ex: Q7M4K9P2"}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
              maxLength={12}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void claimOpenClawPairing()}
              disabled={pairingBusy}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pairingBusy
                ? isSpanish
                  ? "Vinculando..."
                  : "Pairing..."
                : isSpanish
                  ? "Vincular"
                  : "Pair"}
            </button>
          </div>
        </label>

        {pairingStatus ? (
          <p
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              pairingStatusIsError
                ? "border-red-700 bg-red-300 text-black"
                : "border-green-700 bg-green-300 text-black"
            }`}
          >
            {pairingStatus}
          </p>
        ) : null}

        <div
          className={`rounded-xl border p-3 text-xs ${
            hasPairedSession && !pairedSessionExpired
              ? "border-green-700 bg-green-300 text-black"
              : "border-red-700 bg-red-300 text-black"
          }`}
        >
          {hasPairedSession && !pairedSessionExpired
            ? isSpanish
              ? "Sesión de OpenClaw activa en este navegador."
              : "OpenClaw session is active in this browser."
            : isSpanish
              ? "No hay una sesión activa. Vinculá un código para empezar."
              : "No active session yet. Pair a code to get started."}
          {config.openclawPairedAgentName ? (
            <div className="mt-2 text-[11px] text-black/80">
              {isSpanish ? "Agente" : "Agent"}: {config.openclawPairedAgentName}
            </div>
          ) : null}
          {config.openclawPairedSessionExpiresAt ? (
            <div className="mt-1 text-[11px] text-black/80">
              {isSpanish ? "Vence" : "Expires"}:{" "}
              {new Date(config.openclawPairedSessionExpiresAt).toLocaleString()}
            </div>
          ) : null}
        </div>

        {hasPairedSession ? (
          <button
            type="button"
            onClick={clearPairedSession}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
          >
            {isSpanish ? "Desconectar sesión" : "Disconnect session"}
          </button>
        ) : null}
      </div>

    </div>
  );

  if (config.provider === "bitte") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.bitte.ai/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
          >
            {isSpanish ? "Conseguir API key de Bitte" : "Get Bitte API key"}
          </a>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bitte API Key
          </span>
          <input
            type="password"
            value={config.bitteApiKey}
            onChange={(event) => updateConfig({ bitteApiKey: event.target.value })}
            placeholder="bitte-..."
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Agent ID" : "Agent ID"}
          </span>
          <input
            type="text"
            value={config.bitteAgentId}
            onChange={(event) => updateConfig({ bitteAgentId: event.target.value })}
            placeholder={isSpanish ? "tu-agente-id" : "your-agent-id"}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {isSpanish
            ? "Bitte AI permite interactuar con blockchains NEAR y EVM a través de agentes de IA."
            : "Bitte AI allows interacting with NEAR and EVM blockchains through AI agents."}
        </p>
      </div>
    );
  }

  return null;
}

export function SoundFields() {
  const { isSpanish } = useLanguage();
  const { config, updateConfig } = useSiteShimeji();
  const [browserVoices, setBrowserVoices] = useState<Array<{ name: string; lang: string }>>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const syncVoices = () => {
      const voices = synth
        .getVoices()
        .map((voice) => ({
          name: String(voice.name || "").trim(),
          lang: String(voice.lang || "").trim(),
        }))
        .filter((voice) => voice.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setBrowserVoices(voices);
    };

    syncVoices();
    synth.addEventListener?.("voiceschanged", syncVoices);
    return () => synth.removeEventListener?.("voiceschanged", syncVoices);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        {isSpanish
          ? "Modo gratis: usa voz del navegador (micrófono + síntesis de voz). Suele funcionar mejor en Chrome/Edge. ElevenLabs es opcional para una voz más natural."
          : "Free mode uses browser voice features (microphone + speech synthesis). It usually works best in Chrome/Edge. ElevenLabs is optional for a more natural voice."}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Entrada de voz (hablarle)" : "Voice input (talk to it)"}
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Proveedor de micrófono" : "Microphone provider"}
          </span>
          <select
            value={config.soundInputProvider}
            onChange={(event) =>
              updateConfig({
                soundInputProvider: event.target.value as "off" | "browser",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="off">{isSpanish ? "Desactivado" : "Off"}</option>
            <option value="browser">{isSpanish ? "Navegador (gratis)" : "Browser (free)"}</option>
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <input
            type="checkbox"
            checked={config.soundInputAutoSend}
            onChange={(event) => updateConfig({ soundInputAutoSend: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 accent-[var(--brand-accent)]"
          />
          <span className="text-xs text-foreground/85">
            {isSpanish
              ? "Enviar automáticamente cuando termine de transcribir"
              : "Auto-send when transcription finishes"}
          </span>
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isSpanish ? "Salida de voz (que te hable)" : "Voice output (talks back)"}
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isSpanish ? "Proveedor de voz" : "Voice provider"}
          </span>
          <select
            value={config.soundOutputProvider}
            onChange={(event) =>
              updateConfig({
                soundOutputProvider: event.target.value as "off" | "browser" | "elevenlabs",
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
          >
            <option value="off">{isSpanish ? "Desactivado" : "Off"}</option>
            <option value="browser">{isSpanish ? "Voz del navegador (gratis)" : "Browser voice (free)"}</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <input
            type="checkbox"
            checked={config.soundOutputAutoSpeak}
            onChange={(event) => updateConfig({ soundOutputAutoSpeak: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 accent-[var(--brand-accent)]"
            disabled={config.soundOutputProvider === "off"}
          />
          <span className="text-xs text-foreground/85">
            {isSpanish
              ? "Leer en voz alta automáticamente las respuestas del shimeji"
              : "Automatically speak shimeji replies aloud"}
          </span>
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{isSpanish ? "Volumen" : "Volume"}</span>
            <span>{config.soundOutputVolumePercent}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.soundOutputVolumePercent}
            onChange={(event) =>
              updateConfig({ soundOutputVolumePercent: Number(event.target.value) })
            }
            className="w-full accent-[var(--brand-accent)]"
            disabled={config.soundOutputProvider === "off"}
          />
        </label>

        {config.soundOutputProvider === "browser" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSpanish ? "Voz del navegador" : "Browser voice"}
            </span>
            <select
              value={config.soundOutputBrowserVoiceName}
              onChange={(event) => updateConfig({ soundOutputBrowserVoiceName: event.target.value })}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
            >
              <option value="">
                {isSpanish ? "Automática (por idioma del sitio)" : "Automatic (site language)"}
              </option>
              {browserVoices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} {voice.lang ? `(${voice.lang})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {config.soundOutputProvider === "elevenlabs" && (
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ElevenLabs API Key
              </span>
              <input
                type="password"
                value={config.elevenlabsApiKey}
                onChange={(event) => updateConfig({ elevenlabsApiKey: event.target.value })}
                placeholder="sk_..."
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                autoComplete="off"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Voice ID" : "Voice ID"}
                </span>
                <input
                  type="text"
                  value={config.elevenlabsVoiceId}
                  onChange={(event) => updateConfig({ elevenlabsVoiceId: event.target.value })}
                  placeholder="EXAVITQu4vr4xnSDxMaL"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Modelo" : "Model"}
                </span>
                <input
                  type="text"
                  value={config.elevenlabsModelId}
                  onChange={(event) => updateConfig({ elevenlabsModelId: event.target.value })}
                  placeholder="eleven_flash_v2_5"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              {isSpanish
                ? "La key se guarda localmente en tu navegador y solo se envía cuando pedís generar audio."
                : "The key is stored locally in your browser and is only sent when you request audio generation."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteShimejiConfigPanel({ inline = false }: { inline?: boolean } = {}) {
  const { isSpanish } = useLanguage();
  const [activeTab, setActiveTab] = useState<ConfigPanelTab>("chat");
  const {
    isConfigOpen,
    closeConfig,
    catalog,
    catalogLoading,
    catalogError,
    reloadCatalog,
    config,
    updateConfig,
    resetConfig,
    canUseCurrentProvider,
    freeSiteMessagesRemaining,
  } = useSiteShimeji();

  if (!inline && !isConfigOpen) return null;

  return (
    <div className={inline ? "w-full" : "fixed inset-0 z-[90]"}>
      {!inline ? (
        <button
          type="button"
          aria-label={isSpanish ? "Cerrar panel de configuración" : "Close configuration panel"}
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          onClick={closeConfig}
        />
      ) : null}

      <aside
        className={
          inline
            ? "shimeji-settings-panel mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#06080d]/95 shadow-2xl"
            : "shimeji-settings-panel absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-[#06080d]/95 shadow-2xl"
        }
      >
        <div className={`flex ${inline ? "min-h-0" : "h-full"} flex-col`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                <Settings2 className="h-5 w-5 text-[var(--brand-accent)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Shimeji del sitio" : "Website Shimeji"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isSpanish
                    ? "Configuración local de este navegador"
                    : "Local settings for this browser"}
                </div>
              </div>
            </div>
            {!inline ? (
              <button
                type="button"
                onClick={closeConfig}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-5 flex flex-wrap gap-2">
              {([
                { key: "chat", labelEs: "Proveedor", labelEn: "Provider" },
                { key: "appearance", labelEs: "Chat", labelEn: "Chat" },
                { key: "mascot", labelEs: "Mascota", labelEn: "Mascot" },
                { key: "sound", labelEs: "Sonido", labelEn: "Sound" },
              ] as const).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground"
                        : "border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {isSpanish ? tab.labelEs : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {activeTab === "mascot" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Mascota" : "Mascot"}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Personaje" : "Character"}
                  </span>
                  <select
                    value={config.character}
                    onChange={(event) => updateConfig({ character: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                    disabled={catalogLoading || !catalog?.characters.length}
                  >
                    {(catalog?.characters ?? []).map((character) => (
                      <option key={character.key} value={character.key}>
                        {character.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSpanish ? "Personalidad" : "Personality"}
                  </span>
                  <select
                    value={config.personality}
                    onChange={(event) => updateConfig({ personality: event.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                    disabled={catalogLoading || !catalog?.personalities.length}
                  >
                    {(catalog?.personalities ?? []).map((personality) => (
                      <option key={personality.key} value={personality.key}>
                        {getSiteShimejiPersonalityDisplayLabel(personality, isSpanish)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{isSpanish ? "Tamaño" : "Size"}</span>
                  <span>{config.sizePercent}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={180}
                  step={5}
                  value={config.sizePercent}
                  onChange={(event) => updateConfig({ sizePercent: Number(event.target.value) })}
                  className="w-full accent-[var(--brand-accent)]"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-foreground">
                {catalogError ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-red-700 bg-red-300 px-3 py-2 text-black">
                    <span>{catalogError}</span>
                    <button
                      type="button"
                      onClick={() => reloadCatalog().catch(() => undefined)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/40 px-2 py-1 text-black hover:bg-black/10"
                    >
                      <RefreshCw className="h-3 w-3" />
                      {isSpanish ? "Reintentar" : "Retry"}
                    </button>
                  </div>
                ) : catalogLoading ? (
                  <span>{isSpanish ? "Cargando catálogo de sprites..." : "Loading sprite catalog..."}</span>
                ) : null}
              </div>
              </section>
            )}

            {activeTab === "chat" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                {isSpanish ? "Proveedor de IA" : "AI Provider"}
              </h3>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSpanish ? "Proveedor" : "Provider"}
                </span>
                <select
                  value={config.provider}
                  onChange={(event) =>
                    updateConfig({
                      provider: event.target.value as
                        | "site"
                        | "openrouter"
                        | "ollama"
                        | "openclaw"
                        | "bitte",
                    })
                  }
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand-accent)]"
                >
                  <option value="site">{isSpanish ? "Créditos del sitio (gratis)" : "Site credits (free)"}</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                  <option value="openclaw">OpenClaw</option>
                  <option value="bitte">Bitte AI</option>
                </select>
              </label>

              <ProviderFields />

              <div
                className={`rounded-2xl border p-3 text-xs ${
                  canUseCurrentProvider
                    ? "border-green-700 bg-green-300 text-black"
                    : "border-red-700 bg-red-300 text-black"
                }`}
              >
                {canUseCurrentProvider
                  ? isSpanish
                    ? "Listo: este proveedor puede usarse desde el chat del shimeji."
                    : "Ready: this provider can be used from the shimeji chat."
                  : isSpanish
                    ? "Falta configuración para el proveedor seleccionado (o no quedan créditos del sitio)."
                    : "Missing configuration for the selected provider (or no site credits remain)."}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetConfig}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
                >
                  {isSpanish ? "Restablecer configuración" : "Reset settings"}
                </button>
              </div>

              {config.provider === "site" ? (
                <p className="text-xs text-foreground">
                  {isSpanish
                    ? `Créditos del sitio restantes en este navegador: ${freeSiteMessagesRemaining ?? 0}.`
                    : `Site credits remaining in this browser: ${freeSiteMessagesRemaining ?? 0}.`}
                </p>
              ) : null}

              <div className="rounded-2xl border border-yellow-700 bg-yellow-200 p-4 text-black">
                <p className="text-sm font-semibold text-black">
                  {isSpanish ? "Seguridad y alcance" : "Security and scope"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-black/85">
                  {isSpanish
                    ? config.provider === "openclaw"
                      ? "En modo pairing, este navegador guarda solo un token de sesión temporal y el relay del sitio usa tu gateway remoto."
                      : "Las keys y tokens se guardan solo en tu navegador (localStorage)."
                    : config.provider === "openclaw"
                      ? "In pairing mode, this browser stores only a temporary session token while the site relay uses your remote gateway."
                      : "Keys and tokens are stored only in your browser (localStorage)."}
                </p>
              </div>

              </section>
            )}

            {activeTab === "appearance" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Apariencia del chat" : "Chat appearance"}
                </h3>
                <ChatAppearanceFields />
              </section>
            )}

            {activeTab === "sound" && (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {isSpanish ? "Sonido y voz" : "Sound and voice"}
                </h3>
                <SoundFields />
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
