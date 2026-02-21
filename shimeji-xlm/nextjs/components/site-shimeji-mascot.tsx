"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import styles from "./site-shimeji-mascot.module.css";
import { useLanguage } from "@/components/language-provider";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const SPRITE_SIZE = 72;
const EDGE_MARGIN = 14;
const GRAVITY = 980;
const THROW_MIN_SPEED = 140;
const THROW_SPEED_SCALE = 0.6;
const THROW_MAX_SPEED = 1500;
const THROW_TIMEOUT = 0.7;
const SPARKLE_DURATION = 380;
const DIRECTION_CHANGE_MIN = 3.5;
const DIRECTION_CHANGE_MAX = 6.5;

type Edge = "bottom" | "right" | "top" | "left";

type Segment = {
  edge: Edge;
  length: number;
  start: { x: number; y: number };
  dx: number;
  dy: number;
};

type PerimeterData = {
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  segments: Segment[];
  perimeter: number;
};

type DragMove = { x: number; y: number; t: number };
type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  pos: { x: number; y: number };
  moves: DragMove[];
};

function buildPerimeter(minX: number, maxX: number, minY: number, maxY: number): PerimeterData {
  const hSpan = Math.max(0, maxX - minX);
  const vSpan = Math.max(0, maxY - minY);
  const segments: Segment[] = [
    { edge: "bottom", start: { x: minX, y: maxY }, dx: 1, dy: 0, length: hSpan },
    { edge: "right", start: { x: maxX, y: maxY }, dx: 0, dy: -1, length: vSpan },
    { edge: "top", start: { x: maxX, y: minY }, dx: -1, dy: 0, length: hSpan },
    { edge: "left", start: { x: minX, y: minY }, dx: 0, dy: 1, length: vSpan },
  ];
  const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);
  return { bounds: { minX, maxX, minY, maxY }, segments, perimeter };
}

function normalizeProgress(total: number, value: number) {
  if (!total) return 0;
  let next = value % total;
  if (next < 0) next += total;
  return next;
}

function pointOnPerimeter(data: PerimeterData, progress: number) {
  const { segments, perimeter } = data;
  if (!perimeter) return { x: segments[0].start.x, y: segments[0].start.y, edge: segments[0].edge };
  let remaining = ((progress % perimeter) + perimeter) % perimeter;
  for (const segment of segments) {
    if (segment.length <= 0) continue;
    if (remaining <= segment.length) {
      return {
        x: segment.start.x + segment.dx * remaining,
        y: segment.start.y + segment.dy * remaining,
        edge: segment.edge,
      };
    }
    remaining -= segment.length;
  }
  const fallback = segments[0];
  return { x: fallback.start.x, y: fallback.start.y, edge: fallback.edge };
}

function progressFromPosition(data: PerimeterData, x: number, y: number) {
  let cursor = 0;
  for (const segment of data.segments) {
    if (segment.length <= 0) {
      continue;
    }
    if (segment.dx !== 0) {
      if (Math.abs(y - segment.start.y) <= 1) {
        const delta = segment.dx === 1 ? x - segment.start.x : segment.start.x - x;
        if (delta >= -1 && delta <= segment.length + 1) {
          return cursor + clamp(delta, 0, segment.length);
        }
      }
    } else {
      if (Math.abs(x - segment.start.x) <= 1) {
        const delta = segment.dy === 1 ? y - segment.start.y : segment.start.y - y;
        if (delta >= -1 && delta <= segment.length + 1) {
          return cursor + clamp(delta, 0, segment.length);
        }
      }
    }
    cursor += segment.length;
  }
  return null;
}

function getBoundsFromWindow() {
  const minX = EDGE_MARGIN;
  const minY = EDGE_MARGIN;
  const maxX = Math.max(minX, window.innerWidth - SPRITE_SIZE - EDGE_MARGIN);
  const maxY = Math.max(minY, window.innerHeight - SPRITE_SIZE - EDGE_MARGIN);
  return { minX, maxX, minY, maxY };
}

function clampToBounds(
  x: number,
  y: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
) {
  return { x: clamp(x, bounds.minX, bounds.maxX), y: clamp(y, bounds.minY, bounds.maxY) };
}

export function SiteShimejiMascot() {
  const { isSpanish, language } = useLanguage();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
    const el = messagesListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const mascotXRef = useRef(24);
  const currentPosRef = useRef({ x: 0, y: 0 });
  const progressRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const phaseRef = useRef<"walk" | "held" | "thrown">("walk");
  const thrownVelocityRef = useRef({ x: 0, y: 0 });
  const thrownPosRef = useRef({ x: 0, y: 0 });
  const thrownTimeRef = useRef(0);
  const dragStateRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);
  const blockClickRef = useRef(false);
  const directionTimerRef = useRef(0);
  const directionDurationRef = useRef(
    DIRECTION_CHANGE_MIN + Math.random() * (DIRECTION_CHANGE_MAX - DIRECTION_CHANGE_MIN),
  );
  const jumpTimeoutRef = useRef<number | undefined>(undefined);

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

  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current) {
        window.clearTimeout(jumpTimeoutRef.current);
      }
    };
  }, []);

  const frames = useMemo(
    () => ({
      stand: "/shimeji-original/stand-neutral.png",
      walk: [
        "/shimeji-original/walk-step-left.png",
        "/shimeji-original/stand-neutral.png",
        "/shimeji-original/walk-step-right.png",
        "/shimeji-original/stand-neutral.png",
      ],
      sit: "/shimeji-original/sit.png",
      sittingPc: "/shimeji-original/sit-pc-edge-legs-down.png",
      sittingPcDangle: [
        "/shimeji-original/sit-pc-edge-dangle-frame-1.png",
        "/shimeji-original/sit-pc-edge-dangle-frame-2.png",
      ],
    }),
    [],
  );

  const triggerJumpBurst = () => {
    setIsJumping(true);
    if (jumpTimeoutRef.current) {
      window.clearTimeout(jumpTimeoutRef.current);
    }
    jumpTimeoutRef.current = window.setTimeout(() => {
      setIsJumping(false);
    }, SPARKLE_DURATION);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    actorRef.current?.setPointerCapture(event.pointerId);
    isDraggingRef.current = false;
    blockClickRef.current = false;
    const { x: currX, y: currY } = currentPosRef.current;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - currX,
      offsetY: event.clientY - currY,
      pos: { x: currX, y: currY },
      moves: [{ x: currX, y: currY, t: performance.now() }],
    };
    phaseRef.current = "held";
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const bounds = getBoundsFromWindow();
      const next = clampToBounds(event.clientX - drag.offsetX, event.clientY - drag.offsetY, bounds);
      drag.pos = next;
      const now = event.timeStamp || performance.now();
      drag.moves.push({ x: next.x, y: next.y, t: now });
      if (drag.moves.length > 5) {
        drag.moves.shift();
      }
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        blockClickRef.current = true;
      }
      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      blockClickRef.current = wasDragging;
      dragStateRef.current = null;
      actorRef.current?.releasePointerCapture(drag.pointerId);
      const last = drag.moves[drag.moves.length - 1];
      const first = drag.moves[0];
      const dt = Math.max((last.t - first.t) / 1000, 0.01);
      const vx = (last.x - first.x) / dt;
      const vy = (last.y - first.y) / dt;
      const bounds = getBoundsFromWindow();
      const clamped = clampToBounds(last.x, last.y, bounds);
      thrownPosRef.current = clamped;
      if (Math.hypot(vx, vy) >= THROW_MIN_SPEED) {
        phaseRef.current = "thrown";
        thrownVelocityRef.current = {
          x: clamp(vx * THROW_SPEED_SCALE, -THROW_MAX_SPEED, THROW_MAX_SPEED),
          y: clamp(vy * THROW_SPEED_SCALE, -THROW_MAX_SPEED, THROW_MAX_SPEED),
        };
        thrownTimeRef.current = 0;
        triggerJumpBurst();
      } else {
        phaseRef.current = "walk";
        const perimeter = buildPerimeter(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY);
        const nextProgress = progressFromPosition(perimeter, clamped.x, clamped.y);
        if (typeof nextProgress === "number") {
          progressRef.current = nextProgress;
        }
      }
      event.preventDefault();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  // Initialize position on mount
  useEffect(() => {
    const bounds = getBoundsFromWindow();
    const startX = bounds.maxX;
    const startY = bounds.maxY;
    currentPosRef.current = { x: startX, y: startY };
    progressRef.current = bounds.maxX + (bounds.maxY - bounds.minY);
    if (wrapRef.current) {
      wrapRef.current.style.transform = `translate3d(${Math.round(startX)}px, ${Math.round(startY)}px, 0)`;
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastT = 0;
    let lastFrameT = 0;
    let frameIdx = 0;
    type ChatPose = "sit" | "pc" | "dangle";
    let chatPose: ChatPose = "sit";
    let chatPoseTimer = 0;
    let chatPoseDuration = 2000 + Math.random() * 1500;
    let chatDangleFrame = 0;

    const mobileMq = window.matchMedia("(max-width: 768px)");
    let isMobile = mobileMq.matches;
    const handleMobileChange = (event: MediaQueryListEvent) => {
      isMobile = event.matches;
    };
    mobileMq.addEventListener("change", handleMobileChange);

    const tick = (time: number) => {
      if (!wrapRef.current) {
        raf = requestAnimationFrame(tick);
        lastT = time;
        return;
      }
      if (!lastT) {
        lastT = time;
      }
      const dt = Math.min(0.05, (time - lastT) / 1000);
      lastT = time;

      const bounds = getBoundsFromWindow();
      const perimeter = buildPerimeter(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY);
      const totalPerimeter = perimeter.perimeter;
      const phase = phaseRef.current;
      let targetPos = currentPosRef.current;

      if (phase === "walk" && !openRef.current) {
        directionTimerRef.current += dt;
        if (directionTimerRef.current >= directionDurationRef.current) {
          directionTimerRef.current = 0;
          directionDurationRef.current =
            DIRECTION_CHANGE_MIN + Math.random() * (DIRECTION_CHANGE_MAX - DIRECTION_CHANGE_MIN);
          dirRef.current = dirRef.current === 1 ? -1 : 1;
        }
      }

      if (isMobile && phase === "walk") {
        targetPos = { x: bounds.maxX, y: bounds.maxY };
        if (totalPerimeter) {
          const next = progressFromPosition(perimeter, targetPos.x, targetPos.y);
          if (typeof next === "number") {
            progressRef.current = next;
          }
        }
        imgRef.current?.setAttribute("src", frames.stand);
      } else if (phase === "held" && dragStateRef.current) {
        const next = clampToBounds(dragStateRef.current.pos.x, dragStateRef.current.pos.y, bounds);
        targetPos = next;
        imgRef.current?.setAttribute("src", frames.stand);
      } else if (phase === "thrown") {
        thrownTimeRef.current += dt;
        const velocity = thrownVelocityRef.current;
        velocity.y += GRAVITY * dt;
        let nextX = thrownPosRef.current.x + velocity.x * dt;
        let nextY = thrownPosRef.current.y + velocity.y * dt;
        let landed: Edge | null = null;

        if (nextX <= bounds.minX) {
          nextX = bounds.minX;
          landed = "left";
          velocity.x = 0;
        } else if (nextX >= bounds.maxX) {
          nextX = bounds.maxX;
          landed = "right";
          velocity.x = 0;
        }
        if (nextY <= bounds.minY) {
          nextY = bounds.minY;
          landed = "top";
          velocity.y = 0;
        } else if (nextY >= bounds.maxY) {
          nextY = bounds.maxY;
          landed = "bottom";
          velocity.y = 0;
        }

        thrownVelocityRef.current = velocity;
        thrownPosRef.current = { x: nextX, y: nextY };
        targetPos = thrownPosRef.current;
        imgRef.current?.setAttribute("src", frames.stand);

        const shouldLand = (landed && totalPerimeter) || thrownTimeRef.current >= THROW_TIMEOUT;
        if (shouldLand) {
          phaseRef.current = "walk";
          const nextProgress = progressFromPosition(perimeter, targetPos.x, targetPos.y);
          if (typeof nextProgress === "number") {
            progressRef.current = nextProgress;
          }
          dirRef.current = velocity.x >= 0 ? 1 : -1;
        }
      } else {
        if (!totalPerimeter) {
          targetPos = { x: bounds.minX, y: bounds.maxY };
        } else {
          progressRef.current = normalizeProgress(
            totalPerimeter,
            progressRef.current + dirRef.current * 46 * dt,
          );
          const point = pointOnPerimeter(perimeter, progressRef.current);
          targetPos = { x: point.x, y: point.y };

          if (openRef.current && !isMobile) {
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

            let chatSrc = frames.sit;
            if (chatPose === "pc") {
              chatSrc = frames.sittingPc;
            } else if (chatPose === "dangle") {
              if (time - lastFrameT > 250) {
                lastFrameT = time;
                chatDangleFrame = (chatDangleFrame + 1) % frames.sittingPcDangle.length;
              }
              chatSrc = frames.sittingPcDangle[chatDangleFrame];
            }
            imgRef.current?.setAttribute("src", chatSrc);
          } else {
            if (time - lastFrameT > 170) {
              lastFrameT = time;
              frameIdx = (frameIdx + 1) % frames.walk.length;
              imgRef.current?.setAttribute("src", frames.walk[frameIdx]);
            }
          }
        }
      }

      wrapRef.current.style.transform = `translate3d(${Math.round(targetPos.x)}px, ${Math.round(
        targetPos.y,
      )}px, 0)`;
      currentPosRef.current = targetPos;
      mascotXRef.current = Math.round(targetPos.x);

      const facingSource = phaseRef.current === "thrown" ? thrownVelocityRef.current.x : dirRef.current;
      const normalizedFacing = facingSource === 0 ? dirRef.current : facingSource > 0 ? 1 : -1;
      imgRef.current?.style.setProperty("transform", `scaleX(${-normalizedFacing})`);

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

  return (
    <>
      <div className={styles.wrap} ref={wrapRef} aria-hidden={false}>
        <div
          ref={actorRef}
          className={styles.actor}
          onClick={() => {
            if (blockClickRef.current) {
              blockClickRef.current = false;
              return;
            }
            setOpen(v => {
              const next = !v;
              if (next) ensureGreeting();
              return next;
            });
          }}
          onPointerDown={handlePointerDown}
          role="button"
          tabIndex={0}
          title={isSpanish ? "Hablá con Shimeji" : "Talk to Shimeji"}
        >
          <img className={styles.sprite} src={frames.walk[0]} alt="" ref={imgRef} draggable={false} />
          {isJumping && (
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-1/4 left-0 text-xl animate-ping">✦</span>
              <span className="absolute top-1/3 right-0 text-lg animate-ping animation-delay-100">✦</span>
              <span className="absolute bottom-1/3 left-1/4 text-sm animate-ping animation-delay-200">✦</span>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div
          ref={bubbleRef}
          className={`${styles.bubble} ${styles.bubbleFixed}`}
          style={{
            left: Math.round(
              clamp(mascotXRef.current + 36 - 170, 8, (typeof window !== "undefined" ? window.innerWidth : 800) - 340 - 8),
            ),
          }}
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
          <div className={styles.messages} ref={messagesListRef}>
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
                  isSpanish
                    ? "Preguntame sobre Shimeji AI Pets..."
                    : "Ask about Shimeji AI Pets..."
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
