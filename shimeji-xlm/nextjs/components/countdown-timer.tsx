"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  endTime: number; // Unix timestamp in seconds
  labels?: { days: string; hours: string; minutes: string; seconds: string };
  highlight?: boolean;
}

export function CountdownTimer({
  endTime,
  labels = { days: "days", hours: "hrs", minutes: "min", seconds: "sec" },
  highlight = false,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    function update() {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, endTime - now);
      setTimeLeft({
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const ended = timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;

  if (ended) {
    return (
      <div
        className={`text-center font-semibold ${highlight ? "text-base text-foreground" : "text-sm text-[var(--brand-accent)]"}`}
      >
        Auction ended
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${highlight ? "gap-2 sm:gap-3" : "gap-3"}`}>
      {[
        { value: timeLeft.d, label: labels.days },
        { value: timeLeft.h, label: labels.hours },
        { value: timeLeft.m, label: labels.minutes },
        { value: timeLeft.s, label: labels.seconds },
      ].map(({ value, label }, index) => (
        <div
          key={label}
          className={`flex flex-col items-center ${
            highlight
              ? `countdown-unit-highlight ${index === 3 ? "countdown-seconds-pulse" : ""}`
              : ""
          }`}
        >
          <span className={`${highlight ? "text-3xl md:text-4xl" : "text-2xl"} font-bold tabular-nums text-foreground`}>
            {String(value).padStart(2, "0")}
          </span>
          <span
            className={`uppercase tracking-wider ${
              highlight ? "text-[10px] text-foreground/70 md:text-xs" : "text-xs text-muted-foreground"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
