"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";

export function ShimejiCharacter() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isJumping, setIsJumping] = useState(false);
  const { isSpanish } = useLanguage();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 400);

      setPosition({
        x: Math.random() * 10 - 5,
        y: Math.random() * 5 - 2.5,
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative transition-all duration-500 ease-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px) ${
          isJumping ? "translateY(-30px)" : ""
        }`,
      }}
    >
      <div className="relative">
        {/* Main character image */}
        <img
          src="/mascota-shimeji-2.png"
          alt={isSpanish ? "Personaje mascota Shimeji_2" : "Shimeji_2 mascot character"}
          className="w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
        />

        {/* Floating sparkles on jump */}
        {isJumping && (
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute top-1/4 left-0 text-xl animate-ping">
              ✦
            </span>
            <span className="absolute top-1/3 right-0 text-lg animate-ping animation-delay-100">
              ✦
            </span>
            <span className="absolute bottom-1/3 left-1/4 text-sm animate-ping animation-delay-200">
              ✦
            </span>
          </div>
        )}

        {/* Platform shadow */}
        {/* <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-foreground/10 rounded-full blur-sm" /> */}
      </div>
    </div>
  );
}
