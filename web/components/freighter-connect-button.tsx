"use client";

import { Button } from "@/components/ui/button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";

function shortenKey(key: string) {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function FreighterConnectButton() {
  const { isSpanish } = useLanguage();
  const {
    isAvailable,
    isDetecting,
    isConnected,
    isConnecting,
    publicKey,
    network,
    error,
    connect,
    disconnect,
  } = useFreighter();

  const localizeError = (value: string) => {
    if (!isSpanish) return value;
    if (value === "Freighter wallet not detected.") return "No se detectó la wallet Freighter.";
    if (value === "Unable to read Freighter connection.") return "No se pudo leer la conexión de Freighter.";
    if (value === "Connection request was rejected or failed.") return "La solicitud de conexión fue rechazada o falló.";
    return value;
  };

  // While still detecting, show a connect button (not "Install")
  // so users don't see a flash of "Install Freighter" on every load
  if (!isAvailable && !isDetecting) {
    return (
      <Button
        asChild
        className="neural-button rounded-xl px-4"
      >
        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
          {isSpanish ? "Instalar Freighter" : "Install Freighter"}
        </a>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={isConnected ? disconnect : connect}
        className="neural-button rounded-xl px-4"
        disabled={isConnecting || isDetecting}
      >
        {isDetecting
          ? (isSpanish ? "Detectando wallet..." : "Detecting wallet...")
          : isConnecting
            ? (isSpanish ? "Conectando..." : "Connecting...")
            : isConnected
              ? (isSpanish ? "Desconectar" : "Disconnect")
              : (isSpanish ? "Conectar Freighter" : "Connect Freighter")}
      </Button>
      {isConnected && publicKey && (
        <div className="hidden xl:flex flex-col text-xs text-muted-foreground">
          <span>{shortenKey(publicKey)}</span>
          {network && <span>{network}</span>}
        </div>
      )}
      {error && (
        <span className="hidden xl:inline text-xs text-red-600">
          {localizeError(error)}
        </span>
      )}
    </div>
  );
}
