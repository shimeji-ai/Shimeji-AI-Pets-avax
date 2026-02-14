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
    if (value === "No compatible wallet detected.") return "No se detectó una billetera compatible.";
    if (value === "Unable to read wallet connection.") return "No se pudo leer la conexión de la billetera.";
    if (value === "Connection request was rejected or failed.") return "La solicitud de conexión fue rechazada o falló.";
    if (value === "No wallet selected.") return "No hay una billetera seleccionada.";
    return value;
  };

  // While detecting, keep the connect button visible to avoid install-button flicker.
  if (!isAvailable && !isDetecting) {
    return (
      <Button
        asChild
        className="neural-button rounded-xl px-4"
      >
        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
          {isSpanish ? "Instalar wallet" : "Install wallet"}
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
              : (isSpanish ? "Conectar billetera" : "Connect wallet")}
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
