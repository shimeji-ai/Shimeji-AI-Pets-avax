"use client";

import { useState, useEffect } from "react";
import { NavHeader } from "@/components/nav-header";
import { Footer } from "@/components/footer";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Sparkles, Wallet, CheckCircle, Loader2 } from "lucide-react";

export default function FactoryPage() {
  const [mounted, setMounted] = useState(false);
  const [intent, setIntent] = useState("");
  const [email, setEmail] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [reserveError, setReserveError] = useState("");
  const { isSpanish } = useLanguage();
  const { isConnected, publicKey, isAvailable } = useFreighter();
  const t = (en: string, es: string) => (isSpanish ? es : en);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReserve = async () => {
    setReserveError("");
    if (!email.trim()) {
      setReserveError(isSpanish
        ? "Ingresa un email para poder contactarte."
        : "Please enter an email so we can contact you.");
      return;
    }
    if (!publicKey) {
      setReserveError(isSpanish
        ? "Conecta tu wallet para reservar un huevo."
        : "Connect your wallet to reserve an egg.");
      return;
    }
    setIsReserving(true);
    setReserved(false);

    try {
      const response = await fetch("/api/egg-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          wallet: publicKey,
          intention: intent.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || t("Could not submit request.", "No se pudo enviar la solicitud."));
      }
      setReserved(true);
    } catch (error) {
      setReserveError(error instanceof Error ? error.message : t("Could not submit request.", "No se pudo enviar la solicitud."));
    } finally {
      setIsReserving(false);
    }
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
                {t(
                  "Buy an egg, set an intention, and your pet will arrive ready to chat and accompany you.",
                  "Comprá un huevo, definí una intención y tu mascota llegará lista para chatear y acompañarte."
                )}
              </p>
            </div>
          </div>

          {!mounted ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-transparent mb-4"></div>
              <p className="text-muted-foreground">{t("Loading...", "Cargando...")}</p>
            </div>
          ) : isConnected ? (
            <div className="neural-card rounded-2xl p-6 mb-10">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground font-semibold">
                      {t("Egg", "Huevo")}
                      </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {t("Custom Handcrafted Egg", "Huevo artesanal personalizado")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "You are buying an egg. It opens a few days after purchase. Your intention shapes its art direction and personality. We'll email you when your shimeji is ready, and it will appear in the extension with full AI chat support.",
                          "Estás comprando un huevo. Se abre unos días después de la compra. Tu intención define su dirección artística y personalidad. Te avisamos por email cuando tu shimeji esté listo, y aparecerá en la extensión con chat AI completo."
                        )}
                      </p>
                    </div>
                  </div>

                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("Intention for this egg", "Intención para este huevo")}
                  </label>
                  <textarea
                    value={intent}
                    onChange={(event) => setIntent(event.target.value)}
                    placeholder={t(
                      "e.g. Help me focus while I code, remind me to take breaks",
                      "ej. Ayudame a concentrarme mientras codeo, recordame tomar descansos"
                    )}
                    className="w-full min-h-[110px] rounded-xl border border-white/10 bg-[#0b0f14] p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    maxLength={240}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{t("Max 240 characters", "Máximo 240 caracteres")}</span>
                    <span>{intent.length}/240</span>
                  </div>

                  <label className="block text-sm font-semibold text-foreground mt-4 mb-2">
                    {t("Contact email", "Email de contacto")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("you@email.com", "tu@email.com")}
                    className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                    required
                  />
                </div>

                <div className="w-full lg:w-[280px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {t("Checkout", "Pago")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("Connected as", "Conectado como")}{" "}
                      {publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Freighter"}.
                    </p>
                    <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                      <span>{t("Egg price", "Precio del huevo")}</span>
                      <span className="font-semibold">{t("Coming soon", "Próximamente")}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-sm">
                      <span>{t("Network", "Red")}</span>
                      <span className="font-semibold">Stellar</span>
                    </div>
                  </div>

                  {reserved ? (
                    <div className="mt-4 bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                      <CheckCircle className="w-6 h-6 text-[var(--brand-accent)] mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        {t("Egg reserved!", "¡Huevo reservado!")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("We'll reach out when payments go live.", "Te avisamos cuando los pagos estén disponibles.")}
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
                          <Loader2 className="w-4 h-4 animate-spin" /> {t("Reserving...", "Reservando...")}
                        </span>
                      ) : (
                        t("Reserve Egg", "Reservar huevo")
                      )}
                    </Button>
                  )}
                  {reserveError ? (
                    <p className="mt-3 text-xs text-red-500">{reserveError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 mb-8 neural-card rounded-2xl">
              <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                {isAvailable ? (
                  isSpanish
                    ? "Conecta tu wallet Freighter para reservar un huevo."
                    : "Connect your Freighter wallet to reserve an egg."
                ) : (
                  isSpanish ? (
                    <>
                      No detectamos Freighter.{" "}
                      <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                        Instalá Freighter
                      </a>{" "}
                      para continuar.
                    </>
                  ) : (
                    <>
                      Freighter not detected.{" "}
                      <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                        Install Freighter
                      </a>{" "}
                      to continue.
                    </>
                  )
                )}
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
