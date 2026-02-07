"use client";

import { useState, useEffect } from "react";
import { NavHeader } from "@/components/nav-header";
import { Footer } from "@/components/footer";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { Button } from "@/components/ui/button";
import { Sparkles, Wallet, CheckCircle, Loader2 } from "lucide-react";

export default function FactoryPage() {
  const [mounted, setMounted] = useState(false);
  const [intent, setIntent] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [reserved, setReserved] = useState(false);
  const { isConnected, publicKey } = useFreighter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReserve = async () => {
    setIsReserving(true);
    setReserved(false);

    setTimeout(() => {
      setIsReserving(false);
      setReserved(true);
    }, 900);
  };

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader showConnectButton />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-[var(--brand-accent)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Shimeji AI Pets
              </h1>
              <p className="text-sm text-muted-foreground">
                Buy an egg, set an intention, and your pet will arrive ready to
                chat and accompany you.
              </p>
            </div>
          </div>

          <div className="neural-card rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-2">Intergalactic Egg</h2>
            <p className="text-muted-foreground text-sm">
              Each egg produces a unique shimeji. Your intention shapes its art
              direction and personality. Once ready, it appears in the
              extension with full AI chat support.
            </p>
          </div>

          {!mounted ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-transparent mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : isConnected ? (
            <div className="neural-card rounded-2xl p-6 mb-10">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground font-semibold">
                      Egg
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Starter Egg</h3>
                      <p className="text-sm text-muted-foreground">
                        Opens a few days after purchase. We&apos;ll email you when
                        your shimeji is ready.
                      </p>
                    </div>
                  </div>

                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Intention for this egg
                  </label>
                  <textarea
                    value={intent}
                    onChange={(event) => setIntent(event.target.value)}
                    placeholder="e.g. Help me focus while I code, remind me to take breaks"
                    className="w-full min-h-[110px] rounded-xl border border-white/10 bg-[#0b0f14] p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    maxLength={240}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Max 240 characters</span>
                    <span>{intent.length}/240</span>
                  </div>
                </div>

                <div className="w-full lg:w-[280px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold mb-2">Checkout</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connected as {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Freighter"}.
                    </p>
                    <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                      <span>Egg price</span>
                      <span className="font-semibold">Coming soon</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-sm">
                      <span>Network</span>
                      <span className="font-semibold">Stellar</span>
                    </div>
                  </div>

                  {reserved ? (
                    <div className="mt-4 bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                      <CheckCircle className="w-6 h-6 text-[var(--brand-accent)] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        Egg reserved!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll reach out when payments go live.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleReserve}
                      disabled={isReserving}
                      className="mt-4 w-full neural-button rounded-xl py-6"
                    >
                      {isReserving ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Reserving...
                        </span>
                      ) : (
                        "Reserve Egg"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 mb-8 neural-card rounded-2xl">
              <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                Connect your Freighter wallet to reserve an egg.
              </p>
              <FreighterConnectButton />
            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}
