"use client";

import { Button } from "@/components/ui/button";
import { useFreighter } from "@/components/freighter-provider";

function shortenKey(key: string) {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function FreighterConnectButton() {
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

  // While still detecting, show a connect button (not "Install")
  // so users don't see a flash of "Install Freighter" on every load
  if (!isAvailable && !isDetecting) {
    return (
      <Button
        asChild
        className="neural-button rounded-xl px-4"
      >
        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
          Install Freighter
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
          ? "Detecting wallet..."
          : isConnecting
            ? "Connecting..."
            : isConnected
              ? "Disconnect"
              : "Connect Freighter"}
      </Button>
      {isConnected && publicKey && (
        <div className="hidden xl:flex flex-col text-xs text-muted-foreground">
          <span>{shortenKey(publicKey)}</span>
          {network && <span>{network}</span>}
        </div>
      )}
      {error && (
        <span className="hidden xl:inline text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
