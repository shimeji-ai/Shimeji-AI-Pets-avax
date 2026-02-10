"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./language-provider";

export function GiveawayWidget() {
  const { isSpanish } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  function goToFeedback() {
    const formSection = document.getElementById("feedback-form-section");
    if (formSection) {
      const header = document.querySelector("header.fixed");
      const headerHeight = header instanceof HTMLElement ? header.offsetHeight + 24 : 88;
      const rect = formSection.getBoundingClientRect();
      const target = window.scrollY + rect.top - headerHeight;
      window.scrollTo({ top: target, behavior: "smooth" });
    }
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-[60] flex items-end gap-2">
      <div
        id="giveaway-panel"
        className={`origin-right overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? "pointer-events-auto w-[min(78vw,18rem)] md:w-[min(70vw,24rem)] lg:w-[min(60vw,26rem)] max-w-[calc(100vw-5rem)] opacity-100 translate-x-0"
            : "pointer-events-none w-0 opacity-0 translate-x-3"
        }`}
      >
        <div className="rounded-2xl giveaway-border p-[2px] shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <div className="relative rounded-[calc(1rem-2px)] bg-[#0b0f14] text-white p-3 md:p-4 border border-white/10 giveaway-inner">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-5 top-5 text-xs font-bold text-white/80 hover:text-white"
              aria-label={isSpanish ? "Cerrar popup" : "Close popup"}
            >
              ×
            </button>
            <div className="flex items-stretch gap-3">
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.14em] text-[var(--brand-accent)]">
                  {isSpanish ? "Giveaway Shimeji" : "Shimeji Giveaway"}
                </p>
                <p className="mt-1 text-sm md:text-base font-black leading-tight break-words">
                  {isSpanish ? "Gana 1 comisión personalizada." : "Win 1 custom commission."}
                </p>
                <p className="mt-1 text-xs md:text-sm leading-snug text-white/90 break-words">
                  {isSpanish ? "Sigue a " : "Follow "}
                  <Link
                    href="https://x.com/ShimejiAIPets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline decoration-2 underline-offset-2 text-[var(--brand-accent)] hover:opacity-80"
                  >
                    @ShimejiAIPets
                  </Link>
                  {isSpanish ? " y deja feedback para participar." : " and leave feedback to enter."}
                </p>
                <button
                  type="button"
                  onClick={goToFeedback}
                  className="mt-3 h-10 rounded-xl px-4 text-[11px] font-black giveaway-cta"
                >
                  {isSpanish ? "Ir al formulario" : "Go to feedback form"}
                </button>
              </div>
              <div className="relative h-28 w-28 md:h-32 md:w-32 shrink-0">
                <Image
                  src="/GIVEAWAY2.png"
                  alt={isSpanish ? "Mascota del giveaway" : "Giveaway mascot"}
                  fill
                  sizes="160px"
                  className="object-contain object-right drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .giveaway-border {
          background-size: 300% 300%;
          animation: gradient_301 6s ease infinite;
          background-image: linear-gradient(
            137.48deg,
            rgba(134, 240, 255, 0.35) 10%,
            rgba(255, 255, 255, 0.1) 45%,
            rgba(134, 240, 255, 0.35) 87%
          );
        }

        @keyframes gradient_301 {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        #giveaway-panel .giveaway-inner {
          background: linear-gradient(180deg, rgba(11, 15, 20, 0.96), rgba(12, 22, 38, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        @media (prefers-color-scheme: dark) {
          #giveaway-panel .giveaway-inner {
            background: linear-gradient(180deg, rgba(5, 5, 13, 0.97), rgba(9, 9, 19, 0.98));
          }
        }

        #giveaway-panel .giveaway-cta {
          background: linear-gradient(135deg, rgba(255, 214, 102, 0.95), rgba(255, 155, 210, 0.95));
          color: #1b0b15;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 24px rgba(255, 214, 102, 0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        #giveaway-panel .giveaway-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(255, 214, 102, 0.35);
        }

        :global(body[data-theme="kawaii"]) #giveaway-panel .giveaway-inner {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 214, 102, 0.3));
          color: #2a1f4e;
          border-color: rgba(42, 31, 78, 0.3);
          box-shadow: 0 20px 45px rgba(42, 31, 78, 0.25);
        }

        :global(body[data-theme="kawaii"]) #giveaway-panel .giveaway-cta {
          background: linear-gradient(135deg, #fce38a, #f0a500);
          color: #1b0b15;
          border-color: #f5b81c;
          box-shadow: 0 12px 30px rgba(240, 165, 0, 0.35);
        }

        :global(body[data-theme="kawaii"]) #giveaway-panel .giveaway-cta:hover {
          background: linear-gradient(135deg, #ffe9a3, #ffc558);
          box-shadow: 0 14px 34px rgba(240, 165, 0, 0.45);
        }
      `}</style>
    </div>
  );
}
