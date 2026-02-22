"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "~~/components/language-provider";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };
type MascotState = "falling" | "floor-walking" | "wall-climbing" | "ceiling-walking";
type WallSide = "left" | "right";
type WallDirection = "up" | "down";
const WALK_PAUSE_MIN_MS = 650;
const WALK_PAUSE_MAX_MS = 1800;
const WALK_SEGMENT_MIN_MS = 1400;
const WALK_SEGMENT_MAX_MS = 3400;
const WALK_PAUSE_REVERSE_CHANCE = 0.35;

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
    x: 0,
    y: -72,
    vy: 0,
    dir: 1 as 1 | -1,
    state: "falling" as MascotState,
    wallSide: "left" as WallSide,
    wallDirection: "up" as WallDirection,
    rotation: 0,
    frameIdx: 0,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    floorY: 0,
    lastT: 0,
    lastFrameT: 0,
    lastSideT: 0,
    nextPauseT: 0,
    pauseUntilT: 0,
    pauseState: null as MascotState | null,
  });

  useEffect(() => {
    let raf = 0;
    const spriteW = 72;
    const spriteH = 72;
    const speedPxPerSec = 64;
    const gravity = 1200;
    const floorOffset = 10;

    const minX = 0;
    const minY = 0;

    const updateBounds = () => {
      const vw = window.innerWidth || spriteW;
      const vh = window.innerHeight || spriteH;
      const maxX = Math.max(minX, vw - spriteW);
      const floorY = Math.max(minY, vh - spriteH - floorOffset);
      physicsRef.current.floorY = floorY;
      return { maxX, floorY };
    };

    const initialBounds = updateBounds();
    physicsRef.current.x = Math.random() * initialBounds.maxX;
    physicsRef.current.y = -spriteH;
    physicsRef.current.vy = 0;
    physicsRef.current.state = "falling";
    physicsRef.current.rotation = 0;
    physicsRef.current.dir = Math.random() < 0.5 ? -1 : 1;
    physicsRef.current.nextPauseT = 0;
    physicsRef.current.pauseUntilT = 0;
    physicsRef.current.pauseState = null;

    const handleResize = () => {
      const { maxX, floorY } = updateBounds();
      const p = physicsRef.current;
      p.x = clamp(p.x, minX, maxX);
      if (!p.isDragging) {
        if (p.state === "floor-walking") {
          p.y = floorY;
        } else {
          p.y = clamp(p.y, -spriteH, floorY);
        }
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
      physicsRef.current.state = "falling";
      physicsRef.current.nextPauseT = 0;
      physicsRef.current.pauseUntilT = 0;
      physicsRef.current.pauseState = null;
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!physicsRef.current.isDragging) return;
      e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const { maxX, floorY } = updateBounds();

      physicsRef.current.x = clamp(clientX - physicsRef.current.dragOffsetX, minX, maxX);
      physicsRef.current.y = clamp(clientY - physicsRef.current.dragOffsetY, -spriteH, floorY);
    };

    const handleMouseUp = () => {
      if (!physicsRef.current.isDragging) return;
      physicsRef.current.isDragging = false;
      physicsRef.current.state = "falling";
      physicsRef.current.rotation = 0;
      physicsRef.current.nextPauseT = 0;
      physicsRef.current.pauseUntilT = 0;
      physicsRef.current.pauseState = null;
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

      const { maxX, floorY } = updateBounds();
      const canPauseWhileWalking = p.state === "floor-walking" || p.state === "ceiling-walking";
      if (p.pauseState !== p.state) {
        p.pauseState = p.state;
        p.pauseUntilT = 0;
        p.nextPauseT = canPauseWhileWalking
          ? t + WALK_SEGMENT_MIN_MS + Math.random() * (WALK_SEGMENT_MAX_MS - WALK_SEGMENT_MIN_MS)
          : 0;
      }
      if (canPauseWhileWalking && p.pauseUntilT <= t && p.nextPauseT > 0 && t >= p.nextPauseT) {
        p.pauseUntilT = t + WALK_PAUSE_MIN_MS + Math.random() * (WALK_PAUSE_MAX_MS - WALK_PAUSE_MIN_MS);
        p.nextPauseT =
          p.pauseUntilT + WALK_SEGMENT_MIN_MS + Math.random() * (WALK_SEGMENT_MAX_MS - WALK_SEGMENT_MIN_MS);
        if (Math.random() < WALK_PAUSE_REVERSE_CHANCE) {
          p.dir = p.dir === 1 ? -1 : 1;
        }
      }
      const isWalkPaused = canPauseWhileWalking && p.pauseUntilT > t;

      if (!openRef.current && !p.isDragging) {
        if (p.state === "falling") {
          p.rotation = 0;
          p.vy += gravity * dt;
          p.y += p.vy * dt;
          if (p.y >= floorY) {
            p.y = floorY;
            p.vy = 0;
            p.state = "floor-walking";
            p.rotation = 0;
          }
        } else if (p.state === "floor-walking") {
          p.rotation = 0;
          p.y = floorY;
          if (!isWalkPaused) {
            p.x += p.dir * speedPxPerSec * dt;
          }
          if (p.x <= minX) {
            p.x = minX;
            p.state = "wall-climbing";
            p.wallSide = "left";
            p.wallDirection = "up";
            p.rotation = 90;
          } else if (p.x >= maxX) {
            p.x = maxX;
            p.state = "wall-climbing";
            p.wallSide = "right";
            p.wallDirection = "up";
            p.rotation = 270;
          }
        } else if (p.state === "wall-climbing") {
          if (p.wallSide === "left") {
            p.x = minX;
            p.rotation = 90;
          } else {
            p.x = maxX;
            p.rotation = 270;
          }

          if (p.wallDirection === "up") {
            p.y -= speedPxPerSec * dt;
            if (p.y <= minY) {
              p.y = minY;
              p.state = "ceiling-walking";
              p.dir = p.wallSide === "left" ? 1 : -1;
              p.rotation = 180;
            }
          } else {
            p.y += speedPxPerSec * dt;
            if (p.y >= floorY) {
              p.y = floorY;
              p.state = "floor-walking";
              p.dir = p.wallSide === "left" ? 1 : -1;
              p.rotation = 0;
            }
          }
        } else if (p.state === "ceiling-walking") {
          p.rotation = 180;
          p.y = minY;
          if (!isWalkPaused) {
            p.x += p.dir * speedPxPerSec * dt;
          }
          if (p.x <= minX) {
            p.x = minX;
            p.state = "wall-climbing";
            p.wallSide = "left";
            p.wallDirection = "down";
            p.rotation = 90;
          } else if (p.x >= maxX) {
            p.x = maxX;
            p.state = "wall-climbing";
            p.wallSide = "right";
            p.wallDirection = "down";
            p.rotation = 270;
          }
        }
      } else {
        p.vy = 0;
      }

      if (t - p.lastSideT > 250) {
        p.lastSideT = t;
        const vw = window.innerWidth || 0;
        setBubbleSide(p.x > vw / 2 ? "left" : "right");
      }

      if (imgRef.current) {
        const pausedLocomotion =
          !openRef.current &&
          !p.isDragging &&
          (p.state === "floor-walking" || p.state === "ceiling-walking") &&
          p.pauseUntilT > t;
        if (openRef.current || p.isDragging || p.state === "falling" || pausedLocomotion) {
          if (imgRef.current.getAttribute("src") !== frames.stand) {
            imgRef.current.setAttribute("src", frames.stand);
          }
        } else if (t - p.lastFrameT > 170) {
          p.lastFrameT = t;
          p.frameIdx = (p.frameIdx + 1) % frames.walk.length;
          imgRef.current.setAttribute("src", frames.walk[p.frameIdx]);
        }
        imgRef.current.style.transform = `rotate(${p.rotation}deg)`;
      }

      wrapRef.current.style.transform = `translate3d(${Math.round(clamp(p.x, minX, maxX))}px, ${Math.round(p.y)}px, 0)`;

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
