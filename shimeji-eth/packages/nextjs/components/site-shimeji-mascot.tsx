"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "~~/components/language-provider";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function SiteShimejiMascot() {
  const { isSpanish, language } = useLanguage();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
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
      walk: ["/shimeji-original/walk-step-left.png", "/shimeji-original/walk-step-right.png"],
    }),
    [],
  );

  const [bubbleSide, setBubbleSide] = useState<"left" | "right">("right");

  useEffect(() => {
    let raf = 0;
    let lastT = 0;
    let lastFrameT = 0;
    let lastSideT = 0;

    let x = 24;
    let dir: 1 | -1 = 1;
    let frameIdx = 0;

    const spriteW = 72;
    const margin = 14;
    const speedPxPerSec = 46;

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

      if (!openRef.current) {
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
        if (imgRef.current) imgRef.current.setAttribute("src", frames.stand);
      }

      if (t - lastSideT > 250) {
        lastSideT = t;
        setBubbleSide(x > vw / 2 ? "left" : "right");
      }

      wrapRef.current.style.transform = `translate3d(${Math.round(clamp(x, minX, maxX))}px, 0, 0)`;
      if (imgRef.current) imgRef.current.style.transform = `scaleX(${dir})`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames.stand, frames.walk]);

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

  return (
    <div className={styles.wrap} ref={wrapRef} aria-hidden={false}>
      <div
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
        {open && (
          <div
            className={`${styles.bubble} ${bubbleSide === "left" ? styles.bubbleLeft : styles.bubbleRight}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.bubbleHeader}>
              <div className={styles.title}>{isSpanish ? "Shimeji" : "Shimeji"}</div>
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

        <img className={styles.sprite} src={frames.walk[0]} alt="" ref={imgRef} draggable={false} />
      </div>
    </div>
  );
}
