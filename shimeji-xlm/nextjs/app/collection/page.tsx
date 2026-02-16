"use client";

import { useState, useEffect, useCallback } from "react";
import { Footer } from "@/components/footer";
import { FreighterConnectButton } from "@/components/freighter-connect-button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { Wallet, Download, Loader2 } from "lucide-react";

type NftCharacter = {
  id: string;
  name: string;
};

function sendExtensionMessage(type: string, payload?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("timeout"));
    }, 2000);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (
        event.data?.type === "EXTENSION_RESPONSE" &&
        event.data?.originalType === type
      ) {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(event.data.payload);
      }
    }

    window.addEventListener("message", handler);
    window.postMessage(
      { type: "DAPP_MESSAGE", payload: { type, payload } },
      "*"
    );
  });
}

export default function CollectionPage() {
  const [mounted, setMounted] = useState(false);
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null);
  const [nftCharacters, setNftCharacters] = useState<NftCharacter[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const { isConnected, publicKey, isAvailable } = useFreighter();
  const { isSpanish } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    sendExtensionMessage("pingExtension")
      .then(() => setExtensionDetected(true))
      .catch(() => setExtensionDetected(false));
  }, [mounted]);

  const fetchNfts = useCallback(async () => {
    setLoadingNfts(true);
    try {
      const result = await sendExtensionMessage("getNftCharacters");
      setNftCharacters(Array.isArray(result) ? result : []);
    } catch {
      setNftCharacters([]);
    } finally {
      setLoadingNfts(false);
    }
  }, []);

  useEffect(() => {
    if (extensionDetected && isConnected) {
      fetchNfts();
    }
  }, [extensionDetected, isConnected, fetchNfts]);

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-[var(--brand-accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                {isSpanish ? "Colección NFT" : "NFT Collection"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSpanish
                  ? "Gestiona tus shimejis NFT conectando tu wallet Stellar."
                  : "Manage your NFT shimejis by connecting your Stellar wallet."}
              </p>
            </div>
          </div>

          {!mounted ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-transparent mb-4" />
              <p className="text-muted-foreground">{isSpanish ? "Cargando..." : "Loading..."}</p>
            </div>
          ) : extensionDetected === false ? (
            <div className="flex flex-col items-center justify-center py-12 mb-8 neural-card rounded-2xl">
              <Download className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                {isSpanish
                  ? "Instala la extensión Shimeji AI Pets para gestionar tu colección NFT."
                  : "Install the Shimeji AI Pets extension to manage your NFT collection."}
              </p>
              <a
                href="/download"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold neural-button"
              >
                {isSpanish ? "Descargar Extensión" : "Download Extension"}
              </a>
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center py-12 mb-8 neural-card rounded-2xl">
              <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                {isAvailable ? (
                  isSpanish
                    ? "Conecta tu billetera para ver tu colección de shimejis NFT."
                    : "Connect your wallet to view your NFT shimeji collection."
                ) : (
                  isSpanish ? (
                    <>
                      No detectamos una billetera compatible.{" "}
                      <a className="underline" href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                        Instalá Freighter
                      </a>{" "}
                      para continuar.
                    </>
                  ) : (
                    <>
                      No compatible wallet detected.{" "}
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
          ) : (
            <div className="neural-card rounded-2xl p-6 mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {isSpanish ? "Tus Shimejis NFT" : "Your NFT Shimejis"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isSpanish
                      ? `Conectado como ${publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Wallet"}`
                      : `Connected as ${publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Wallet"}`}
                  </p>
                </div>
              </div>

              {loadingNfts ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {isSpanish ? "Cargando colección..." : "Loading collection..."}
                  </p>
                </div>
              ) : nftCharacters.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    {isSpanish
                      ? "No se encontraron shimejis NFT."
                      : "No NFT shimejis found."}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {isSpanish
                      ? "La integración NFT estará disponible pronto."
                      : "NFT integration coming soon!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nftCharacters.map((nft) => (
                    <div
                      key={nft.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-lg font-bold text-foreground">
                        {(nft.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">
                          {nft.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{nft.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
