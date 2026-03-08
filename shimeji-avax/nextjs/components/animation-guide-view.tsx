"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CHARACTER_CREATOR_PATH,
  PREVIEW_ANIMATION_SETS,
  REQUIRED_SPRITES_ZIP_PATH,
  animationReferenceSpriteUrl,
} from "@/lib/shimeji-sprite-spec";

type GuideSection = {
  key: string;
  title: string;
  description: string;
  explanation: string;
  frames: string[];
};

const sections: GuideSection[] = [
  {
    key: "walk",
    title: "Caminar",
    description: "stand-neutral -> walk-step-left -> stand-neutral -> walk-step-right",
    explanation:
      "Este loop base marca el ritmo del personaje en escritorio y web. Si el baseline cambia entre frames, el personaje vibra o salta visualmente.",
    frames: PREVIEW_ANIMATION_SETS.walk,
  },
  {
    key: "jump",
    title: "Salto y aterrizaje",
    description: "jump -> fall -> bounce-squish -> bounce-recover -> stand-neutral",
    explanation:
      "La secuencia pasa por impulso, caída y recuperación. El rebote le da peso; sin esos frames el personaje se siente rígido.",
    frames: PREVIEW_ANIMATION_SETS.jump,
  },
  {
    key: "drag",
    title: "Arrastre y resistencia",
    description: "tilt-left / tilt-right + resist-frame-1 / resist-frame-2",
    explanation:
      "Cuando arrastrás al shimeji, primero cambia a inclinaciones suaves o fuertes según la dirección y la tensión del drag. Si se estira o resiste, alterna entre resist-frame-1 y resist-frame-2.",
    frames: PREVIEW_ANIMATION_SETS.drag,
  },
  {
    key: "wall-ceiling",
    title: "Pared y techo",
    description: "grab-wall / climb-wall y grab-ceiling / climb-ceiling",
    explanation:
      "Los frames de agarre fijan la pose y los de climb alternan el movimiento. Esa combinación evita que escalar se vea como un simple teletransporte.",
    frames: [...PREVIEW_ANIMATION_SETS.wall, ...PREVIEW_ANIMATION_SETS.ceiling],
  },
  {
    key: "idle",
    title: "Idle expresivo",
    description: "sit -> sit-look-up -> spin-head loop -> sit",
    explanation:
      "Este bloque hace que el personaje siga vivo cuando no está caminando. El spin-head necesita una progresión consistente para que el loop cierre limpio.",
    frames: PREVIEW_ANIMATION_SETS.idle,
  },
  {
    key: "using-computer",
    title: "Usando computadora",
    description: "sit-pc-edge-legs-down -> dangle-1 -> dangle-2 -> dangle-1",
    explanation:
      "Este es el loop que usa el shimeji web cuando la burbuja de chat está abierta y el personaje queda apoyado en el borde de la interfaz como si estuviera usando la compu.",
    frames: PREVIEW_ANIMATION_SETS.usingComputer,
  },
];

function FrameLoop({ frames, title }: { frames: string[]; title: string }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 450);
    return () => window.clearInterval(timer);
  }, [frames]);

  const activeFrame = frames[frameIndex] || frames[0];

  return (
    <div className="rounded-[1.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.18),transparent_58%),linear-gradient(180deg,rgba(4,10,20,0.9),rgba(12,18,32,0.82))] p-5">
      <div className="flex min-h-[230px] items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#07111f] p-5">
        <img
          src={animationReferenceSpriteUrl(activeFrame)}
          alt={`${title} - ${activeFrame}`}
          className="h-40 w-40 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.35)]"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {frames.map((frame, index) => (
          <span
            key={`${title}-${frame}-${index}`}
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              frame === activeFrame
                ? "border-cyan-300/30 bg-cyan-400/20 text-foreground"
                : "border-white/12 bg-white/5 text-foreground/80"
            }`}
          >
            {frame}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnimationGuideView() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="neural-card rounded-3xl border border-cyan-300/15 p-8 sm:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
              Animation Guide
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Guia visual de animacion
            </h1>
            <p className="mt-4 text-sm leading-7 text-foreground/80 sm:text-base">
              Esta guía muestra los sprites reales, explica para qué sirve cada secuencia y reproduce un loop simple para que puedas validar el ritmo visual antes de mintear.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={CHARACTER_CREATOR_PATH}
              className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-emerald-400/25"
            >
              Abrir creador de personajes
            </Link>
            <a
              href="https://github.com/shimeji-ai/Shimeji-AI-Pets-avax/tree/main/animation-reference"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:bg-white/10"
            >
              Ver animation-reference del repo
            </a>
            <a
              href={REQUIRED_SPRITES_ZIP_PATH}
              download
              className="rounded-full border border-amber-300/20 bg-amber-400/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-amber-400/25"
            >
              Descargar ZIP de sprites
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="neural-card rounded-3xl border border-fuchsia-300/15 p-6">
          <h2 className="text-2xl font-semibold text-foreground">Como funciona</h2>
          <div className="mt-4 space-y-3 text-sm text-foreground/80">
            <div className="rounded-2xl border border-white/12 bg-[#0a1322] p-4">
              1. Cargás portada y carpeta de sprites en local.
            </div>
            <div className="rounded-2xl border border-white/12 bg-[#0a1322] p-4">
              2. Revisás el preview del personaje y el checklist de frames requeridos.
            </div>
            <div className="rounded-2xl border border-white/12 bg-[#0a1322] p-4">
              3. Si falta un sprite, no se sube nada y seguís corrigiendo en local.
            </div>
            <div className="rounded-2xl border border-white/12 bg-[#0a1322] p-4">
              4. Cuando el set está completo, podés mintear y después publicar o subastar con el flujo actual.
            </div>
          </div>
        </div>

        <div className="neural-card rounded-3xl border border-cyan-300/15 p-6">
          <h2 className="text-2xl font-semibold text-foreground">Pack descargable</h2>
          <p className="mt-2 text-sm text-foreground/80">
            Bajá el ZIP con los nombres correctos y usalo como base para armar tu personaje. El creador valida ese pack antes de habilitar IPFS y mint.
          </p>
          <div className="mt-6">
            <a
              href={REQUIRED_SPRITES_ZIP_PATH}
              download
              className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-cyan-400/25"
            >
              Descargar ZIP requerido
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section.key} className="neural-card rounded-3xl border border-white/10 p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm font-medium text-cyan-100">{section.description}</p>
                <p className="mt-4 text-sm leading-7 text-foreground/80">{section.explanation}</p>
              </div>
              <FrameLoop frames={section.frames} title={section.title} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {section.frames.map((frame, index) => (
                <div key={`${section.key}-${frame}-${index}`} className="rounded-2xl border border-white/12 bg-[#0a1322] p-3">
                  <div className="flex aspect-square items-center justify-center rounded-xl border border-white/12 bg-white/5 p-3">
                    <img
                      src={animationReferenceSpriteUrl(frame)}
                      alt={frame}
                      className="h-24 w-24 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-2 break-all text-[11px] text-foreground">{frame}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="neural-card rounded-3xl border border-amber-300/15 p-6 text-sm text-foreground/80">
        Mantener mismo canvas, misma baseline y fondo transparente sigue siendo obligatorio para evitar jitter entre frames.
      </div>
    </div>
  );
}
