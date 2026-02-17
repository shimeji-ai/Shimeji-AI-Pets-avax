"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "@/components/language-provider";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pingExtension(timeoutMs = 800): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(false);
    }, timeoutMs);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type === "EXTENSION_RESPONSE" && event.data?.originalType === "pingExtension") {
        window.clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(true);
      }
    }

    window.addEventListener("message", handler);
    window.postMessage({ type: "DAPP_MESSAGE", payload: { type: "pingExtension" } }, "*");
  });
}

export function SiteShimejiMascot() {
  const { isSpanish, language } = useLanguage();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [showMascot, setShowMascot] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pingExtension().then(installed => {
      if (cancelled) return;
      setShowMascot(!installed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (!openRef.current) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (actorRef.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const frames = useMemo(
    () => ({
      stand: "/shimeji-original/stand-neutral.png",
      walk: ["/shimeji-original/walk-step-left.png", "/shimeji-original/stand-neutral.png", "/shimeji-original/walk-step-right.png", "/shimeji-original/stand-neutral.png"],
      sit: "/shimeji-original/sit.png",
      sittingPc: "/shimeji-original/sit-pc-edge-legs-down.png",
      sittingPcDangle: ["/shimeji-original/sit-pc-edge-dangle-frame-1.png", "/shimeji-original/sit-pc-edge-dangle-frame-2.png"],
    }),
    [],
  );

  const mascotXRef = useRef(24);

  useEffect(() => {
    let raf = 0;
    let lastT = 0;
    let lastFrameT = 0;

    let x = 24;
    let dir: 1 | -1 = 1;
    let frameIdx = 0;

    // Chat sitting animation state
    type ChatPose = "sit" | "pc" | "dangle";
    let chatPose: ChatPose = "sit";
    let chatPoseTimer = 0;
    let chatDangleFrame = 0;
    let chatPoseDuration = 2000 + Math.random() * 1500;

    const spriteW = 72;
    const margin = 14;
    const speedPxPerSec = 46;
    const mobileMq = window.matchMedia("(max-width: 768px)");
    let isMobile = mobileMq.matches;

    const handleMobileChange = (event: MediaQueryListEvent) => {
      isMobile = event.matches;
    };

    mobileMq.addEventListener("change", handleMobileChange);

    const tick = (t: number) => {
      if (!wrapRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (!lastT) lastT = t;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      const vw = window.innerWidth || 0;
      const minX = margin;
      const maxX = Math.max(margin, vw - spriteW - margin);

      if (isMobile) {
        // Keep mascot static on mobile, docked to one side.
        x = maxX;
        dir = -1;
        if (imgRef.current) imgRef.current.setAttribute("src", frames.stand);
      } else {
        if (!openRef.current) {
          // Reset chat pose when chat closes
          chatPose = "sit";
          chatPoseTimer = 0;
          chatPoseDuration = 2000 + Math.random() * 1500;
          x += dir * speedPxPerSec * dt;
          if (x <= minX) {
            x = minX;
            dir = 1;
          } else if (x >= maxX) {
            x = maxX;
            dir = -1;
          }

          if (t - lastFrameT > 170) {
            lastFrameT = t;
            frameIdx = (frameIdx + 1) % frames.walk.length;
            const nextSrc = frames.walk[frameIdx];
            if (imgRef.current) imgRef.current.setAttribute("src", nextSrc);
          }
        } else {
          // Chat open: cycle through sit → pc → dangle poses
          chatPoseTimer += dt * 1000;
          if (chatPoseTimer >= chatPoseDuration) {
            chatPoseTimer = 0;
            if (chatPose === "sit") {
              chatPose = "pc";
              chatPoseDuration = 1500 + Math.random() * 1500;
            } else if (chatPose === "pc") {
              chatPose = "dangle";
              chatPoseDuration = 1800 + Math.random() * 1200;
              chatDangleFrame = 0;
            } else {
              chatPose = "sit";
              chatPoseDuration = 2000 + Math.random() * 1500;
            }
          }

          let chatSrc: string;
          if (chatPose === "pc") {
            chatSrc = frames.sittingPc;
          } else if (chatPose === "dangle") {
            if (t - lastFrameT > 250) {
              lastFrameT = t;
              chatDangleFrame = (chatDangleFrame + 1) % frames.sittingPcDangle.length;
            }
            chatSrc = frames.sittingPcDangle[chatDangleFrame];
          } else {
            chatSrc = frames.sit;
          }
          if (imgRef.current) imgRef.current.setAttribute("src", chatSrc);
        }

      }

      const clampedX = Math.round(clamp(x, minX, maxX));
      wrapRef.current.style.transform = `translate3d(${clampedX}px, 0, 0)`;
      if (imgRef.current) imgRef.current.style.transform = `scaleX(${-dir})`;

      mascotXRef.current = clampedX;
      if (bubbleRef.current && !isMobile) {
        const bubbleW = 340;
        const centerX = clampedX + spriteW / 2 - bubbleW / 2;
        const clampedLeft = clamp(centerX, 8, vw - bubbleW - 8);
        bubbleRef.current.style.left = `${clampedLeft}px`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mobileMq.removeEventListener("change", handleMobileChange);
    };
  }, [frames.stand, frames.walk, frames.sit, frames.sittingPc, frames.sittingPcDangle]);

  function ensureGreeting() {
    setMessages(prev => {
      if (prev.length) return prev;
      const hello = isSpanish
        ? "Hola, soy Shimeji. La extensión incluye 5 mascotas gratis. Preguntame de qué va el proyecto y te lo resumo."
        : "Hi, I'm Shimeji. The extension includes 5 free pets. Ask me what this project is about and I'll summarize it.";
      return [{ role: "assistant", content: hello }];
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    setMessages(prev => [...prev, { role: "user", content: text }]);

    try {
      const history = messagesRef.current.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch("/api/shimeji-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, lang: language }),
      });
      const json = await resp.json().catch(() => null);
      const reply = json?.reply;
      if (!resp.ok || typeof reply !== "string" || !reply.trim()) {
        throw new Error("bad-response");
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply.trim() }]);
    } catch {
      const fallback = isSpanish
        ? "Ahora mismo no puedo responder con IA (configuración o red)."
        : "I can't reach the AI right now (config/network issue).";
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setSending(false);
    }
  }

  if (!showMascot) return null;

  return (
    <>
      <div className={styles.wrap} ref={wrapRef} aria-hidden={false}>
        <div
          ref={actorRef}
          className={styles.actor}
          onClick={() => {
            setOpen(v => {
              const next = !v;
              if (next) ensureGreeting();
              return next;
            });
          }}
          role="button"
          tabIndex={0}
          title={isSpanish ? "Hablá con Shimeji" : "Talk to Shimeji"}
        >
          <img className={styles.sprite} src={frames.walk[0]} alt="" ref={imgRef} draggable={false} />
        </div>
      </div>

      {open && (
        <div
          ref={bubbleRef}
          className={`${styles.bubble} ${styles.bubbleFixed}`}
          style={{ left: Math.round(clamp(mascotXRef.current + 36 - 170, 8, (typeof window !== "undefined" ? window.innerWidth : 800) - 340 - 8)) }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.bubbleHeader}>
            <div className={styles.title}>Shimeji</div>
            <button
              className={styles.closeBtn}
              type="button"
              onClick={e => {
                e.stopPropagation();
                setOpen(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className={styles.bubbleBody}>
            <div className={styles.messages}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgAssistant}`}
                >
                  {m.content}
                </div>
              ))}
            </div>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") send();
                }}
                placeholder={
                  isSpanish ? "Preguntame sobre Shimeji AI Pets..." : "Ask about Shimeji AI Pets..."
                }
                disabled={sending}
              />
              <button className={styles.sendBtn} type="button" onClick={send} disabled={sending || !input.trim()}>
                {isSpanish ? (sending ? "..." : "Enviar") : sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
