import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";
import {
  CHARACTER_CREATOR_PATH,
  PREVIEW_ANIMATION_SETS,
  REQUIRED_SHIMEJI_SPRITES,
} from "@/lib/shimeji-sprite-spec";

export const metadata: Metadata = createPageMetadata({
  title: "Animation Guide | Shimeji AI Pets",
  description:
    "Required Shimeji sprite files, animation loops, and the local-first NFT creator flow.",
  path: "/animation-guide",
});

const sections = [
  {
    title: "Walk",
    titleEs: "Caminar",
    description: "stand -> left -> stand -> right",
    descriptionEs: "stand -> left -> stand -> right",
    frames: PREVIEW_ANIMATION_SETS.walk,
  },
  {
    title: "Jump + Land",
    titleEs: "Salto + aterrizaje",
    description: "jump -> fall -> bounce-squish -> bounce-recover -> stand",
    descriptionEs: "jump -> fall -> bounce-squish -> bounce-recover -> stand",
    frames: PREVIEW_ANIMATION_SETS.jump,
  },
  {
    title: "Wall + Ceiling",
    titleEs: "Pared + techo",
    description: "grab + climb alternation",
    descriptionEs: "grab + alternancia de climb",
    frames: [...PREVIEW_ANIMATION_SETS.wall, ...PREVIEW_ANIMATION_SETS.ceiling],
  },
  {
    title: "Idle / Expressive",
    titleEs: "Idle / expresivo",
    description: "sit, look-up, spin-head loop",
    descriptionEs: "sit, look-up, loop de spin-head",
    frames: PREVIEW_ANIMATION_SETS.idle,
  },
];

export default function AnimationGuidePage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.28)] backdrop-blur">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
              Animation Guide
            </span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Referencia rápida para sprites y preview local
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Esta guía toma la referencia del repo y la baja a lo que hoy usa el runtime web/desktop:
              nombres de archivos, loops principales y el flujo local-first del creador de personajes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={CHARACTER_CREATOR_PATH}
                className="rounded-full border border-emerald-300/25 bg-emerald-400/15 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-emerald-400/25"
              >
                Abrir creador de personajes
              </Link>
              <a
                href="https://github.com/lulox/Shimeji-AI-Pets-avax/tree/main/animation-reference"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:bg-white/10"
              >
                Ver animation-reference del repo
              </a>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-semibold text-foreground">Sprites requeridos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Si falta cualquiera de estos archivos, el creador deja el personaje en modo local y no habilita el push a IPFS / mint.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {REQUIRED_SHIMEJI_SPRITES.map((fileName) => (
                  <div
                    key={fileName}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-foreground/90"
                  >
                    {fileName}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-fuchsia-300/15 bg-fuchsia-400/[0.06] p-6">
              <h2 className="text-2xl font-semibold text-foreground">Flujo recomendado</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  1. Cargá portada y carpeta de sprites en el creador.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  2. Revisá el preview local y corregí archivos faltantes.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  3. Elegí si querés solo mintear, publicar a precio fijo o iniciar subasta.
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  4. Recién al confirmar se sube a IPFS y se ejecuta el flujo onchain existente.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-foreground">{section.titleEs}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{section.descriptionEs}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.frames.map((frame, index) => (
                    <span
                      key={`${section.title}-${frame}-${index}`}
                      className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-50/90"
                    >
                      {frame}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-amber-300/15 bg-amber-400/[0.06] p-6 text-sm text-muted-foreground">
            Mantener mismo canvas, misma baseline y fondo transparente sigue siendo obligatorio para evitar jitter.
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
