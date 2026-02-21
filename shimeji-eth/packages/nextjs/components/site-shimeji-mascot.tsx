"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "~~/components/language-provider";

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
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

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

  // Physics refs for smooth animation without re-renders
  const physicsRef = useRef({
    x: 24,
    y: 0,
    vy: 0,
    dir: 1 as 1 | -1,
    frameIdx: 0,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    onFloor: true,
    floorY: 0,
    lastT: 0,
    lastFrameT: 0,
    lastSideT: 0,
  });

  useEffect(() => {
    let raf = 0;
    const spriteW = 72;
    const spriteH = 72;
    const margin = 14;
    const speedPxPerSec = 46;
    const gravity = 1200; // pixels per second squared
    const bounceDamping = 0.4;
    const floorOffset = 10; // matches CSS bottom: 10px

    const updateFloorY = () => {
      const vh = window.innerHeight || 0;
      physicsRef.current.floorY = vh - spriteH - floorOffset;
    };

    updateFloorY();
    // Start on the floor
    physicsRef.current.y = physicsRef.current.floorY;

    const handleResize = () => {
      updateFloorY();
      // Keep mascot on floor after resize
      if (!physicsRef.current.isDragging && physicsRef.current.onFloor) {
        physicsRef.current.y = physicsRef.current.floorY;
      }
    };
    window.addEventListener("resize", handleResize);

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!actorRef.current?.contains(target)) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      physicsRef.current.isDragging = true;
      physicsRef.current.dragOffsetX = clientX - physicsRef.current.x;
      physicsRef.current.dragOffsetY = clientY - physicsRef.current.y;
      physicsRef.current.vy = 0;
      physicsRef.current.onFloor = false;
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!physicsRef.current.isDragging) return;
      e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const vw = window.innerWidth || 0;
      const minX = margin;
      const maxX = Math.max(margin, vw - spriteW - margin);

      physicsRef.current.x = clamp(clientX - physicsRef.current.dragOffsetX, minX, maxX);
      physicsRef.current.y = clientY - physicsRef.current.dragOffsetY;
    };

    const handleMouseUp = () => {
      if (!physicsRef.current.isDragging) return;
      physicsRef.current.isDragging = false;
      physicsRef.current.onFloor = false; // Will fall due to gravity
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchstart", handleMouseDown, { passive: false });
    document.addEventListener("touchmove", handleMouseMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp);

    const tick = (t: number) => {
      if (!wrapRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const p = physicsRef.current;
      if (!p.lastT) p.lastT = t;
      const dt = Math.min(0.05, (t - p.lastT) / 1000);
      p.lastT = t;

      const vw = window.innerWidth || 0;
      const minX = margin;
      const maxX = Math.max(margin, vw - spriteW - margin);

      if (!openRef.current && !p.isDragging) {
        // Apply gravity when not on floor
        if (!p.onFloor) {
          p.vy += gravity * dt;
          p.y += p.vy * dt;

          // Floor collision
          if (p.y >= p.floorY) {
            p.y = p.floorY;
            if (Math.abs(p.vy) > 100) {
              // Bounce with damping
              p.vy = -p.vy * bounceDamping;
            } else {
              // Stop bouncing, snap to floor
              p.vy = 0;
              p.onFloor = true;
            }
          }
        }

        // Walking on floor
        if (p.onFloor) {
          p.x += p.dir * speedPxPerSec * dt;
          if (p.x <= minX) {
            p.x = minX;
            p.dir = 1;
          } else if (p.x >= maxX) {
            p.x = maxX;
            p.dir = -1;
          }

          if (t - p.lastFrameT > 170) {
            p.lastFrameT = t;
            p.frameIdx = (p.frameIdx + 1) % frames.walk.length;
            const nextSrc = frames.walk[p.frameIdx];
            if (imgRef.current) imgRef.current.setAttribute("src", nextSrc);
          }
        }
      } else {
        // Standing still when chat is open
        if (imgRef.current) imgRef.current.setAttribute("src", frames.stand);
      }

      if (t - p.lastSideT > 250) {
        p.lastSideT = t;
        setBubbleSide(p.x > vw / 2 ? "left" : "right");
      }

      // Apply transform using translate3d for both X and Y
      wrapRef.current.style.transform = `translate3d(${Math.round(clamp(p.x, minX, maxX))}px, ${Math.round(p.y)}px, 0)`;
      // Sprite art faces opposite of movement direction by default; invert to avoid moonwalking.
      if (imgRef.current) imgRef.current.style.transform = `scaleX(${-p.dir})`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchstart", handleMouseDown);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
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

  if (!showMascot) return null;

  return (
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
