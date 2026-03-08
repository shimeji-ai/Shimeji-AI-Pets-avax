import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketplaceHub } from "@/components/marketplace-hub";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Character Creator | Shimeji AI Pets",
  description:
    "Load Shimeji sprites locally, preview the character in the browser, and mint only when the full set is ready.",
  path: "/character-creator",
});

export default function CharacterCreatorPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-28 md:px-6 lg:px-8">
        <div className="neural-card rounded-3xl border border-cyan-300/15 p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Character Creator</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Cargá sprites en local, previsualizá y minteá recién al final
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Esta página está dedicada al flujo de artistas: probar el personaje en la web sin subir assets a internet,
            validar el set completo y después usar el flujo existente de IPFS + NFT + venta o subasta.
          </p>
        </div>
      </section>
      <Suspense fallback={null}>
        <MarketplaceHub mode="creator" />
      </Suspense>
      <Footer />
    </main>
  );
}
