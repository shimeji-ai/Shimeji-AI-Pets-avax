"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAddress,
  getNetwork,
  getNetworkDetails,
  isConnected as apiIsConnected,
  requestAccess,
} from "@stellar/freighter-api";
import { STELLAR_NETWORK } from "@/lib/contracts";

type FreighterState = {
  isAvailable: boolean;
  isDetecting: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  publicKey: string | null;
  network: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
};

const FreighterContext = createContext<FreighterState | null>(null);

function hasError<T extends { error?: unknown }>(value: T): value is T & {
  error: { message?: string } | string;
} {
  return Boolean(value && "error" in value && value.error);
}

function hasWindowFreighter() {
  if (typeof window === "undefined") return false;
  const anyWindow = window as unknown as {
    freighterApi?: unknown;
    freighter?: unknown;
  };
  return Boolean(anyWindow.freighterApi || anyWindow.freighter);
}

async function getNetworkLabel(): Promise<string | null> {
  const details = await getNetworkDetails();
  if (hasError(details)) {
    const networkObj = await getNetwork();
    if (hasError(networkObj)) {
      return null;
    }
    return networkObj.network || null;
  }
  return details.network || details.networkPassphrase || null;
}

/** Try the API's isConnected; returns null if the call errors out. */
async function probeFreighter(): Promise<boolean | null> {
  try {
    const status = await apiIsConnected();
    if (hasError(status)) return null;
    return status.isConnected;
  } catch {
    return null;
  }
}

export function FreighterProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const detectionDone = useRef(false);
  const autoConnectTried = useRef(false);
  const shouldAutoConnect = STELLAR_NETWORK !== "local";

  const refresh = useCallback(async () => {
    try {
      // Quick check: window global may already exist
      if (hasWindowFreighter()) {
        setIsAvailable(true);
      }

      const status = await apiIsConnected();
      if (hasError(status)) {
        // API returned an error – Freighter not reachable
        if (!hasWindowFreighter()) {
          setIsAvailable(false);
        }
        setConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      // If the API responded without error, Freighter is installed
      setIsAvailable(true);

      if (!status.isConnected) {
        setConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      const addressObj = await getAddress();
      if (hasError(addressObj)) {
        setConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      const nextNetwork = await getNetworkLabel();
      setConnected(Boolean(addressObj.address));
      setPublicKey(addressObj.address || null);
      setNetwork(nextNetwork);
      setError(null);
    } catch (err) {
      console.error("Freighter refresh error:", err);
      setError("Unable to read Freighter connection.");
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const access = await requestAccess();
      if (hasError(access)) {
        // If requestAccess errors, Freighter might not be installed
        const windowAvailable = hasWindowFreighter();
        if (!windowAvailable) {
          setIsAvailable(false);
          setError("Freighter wallet not detected.");
        } else {
          throw new Error(
            typeof access.error === "string"
              ? access.error
              : access.error.message || "Connection request failed."
          );
        }
        return;
      }

      setIsAvailable(true);
      const nextNetwork = await getNetworkLabel();
      setConnected(true);
      setPublicKey(access.address);
      setNetwork(nextNetwork);
      setError(null);
    } catch (err) {
      console.error("Freighter connect error:", err);
      setError("Connection request was rejected or failed.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setPublicKey(null);
    setNetwork(null);
    setError(null);
  }, []);

  // On mount: retry detection to handle late extension injection.
  // Freighter's content script may load after the page's JS runs;
  // the API uses postMessage with a 2s timeout, so early calls
  // silently return isConnected:false even when Freighter is installed.
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Try up to 4 times: 0ms, 500ms, 1500ms, 3500ms
      const delays = [0, 500, 1000, 2000];
      for (const delay of delays) {
        if (cancelled || detectionDone.current) return;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;

        // Fast path: window global appeared
        if (hasWindowFreighter()) {
          detectionDone.current = true;
          setIsAvailable(true);
          setIsDetecting(false);
          await refresh();
          return;
        }

        // Slow path: try the API (postMessage → extension)
        const result = await probeFreighter();
        if (cancelled) return;

        if (result !== null) {
          // Got a real response – extension is installed
          detectionDone.current = true;
          setIsAvailable(true);
          setIsDetecting(false);
          await refresh();
          return;
        }
      }
      // All retries exhausted – Freighter not found
      if (!cancelled) {
        detectionDone.current = true;
        setIsAvailable(hasWindowFreighter());
        setIsDetecting(false);
      }
    }

    detect();

    // Also listen for late injection via Freighter's postMessage
    function onMessage(e: MessageEvent) {
      if (
        e.data?.source === "FREIGHTER_EXTERNAL_MSG_RESPONSE" &&
        !detectionDone.current
      ) {
        detectionDone.current = true;
        setIsAvailable(true);
        setIsDetecting(false);
        refresh();
      }
    }
    window.addEventListener("message", onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
    };
  }, [refresh]);

  useEffect(() => {
    if (!shouldAutoConnect) return;
    if (isDetecting || isConnecting || !isAvailable || connected) return;
    if (autoConnectTried.current) return;
    autoConnectTried.current = true;

    connect().catch(() => {
      // connect already sets UI error state; this prevents unhandled rejection noise.
    });
  }, [connected, connect, isAvailable, isConnecting, isDetecting, shouldAutoConnect]);

  const value = useMemo(
    () => ({
      isAvailable,
      isDetecting,
      isConnected: connected,
      isConnecting,
      publicKey,
      network,
      error,
      connect,
      disconnect,
      refresh,
    }),
    [
      isAvailable,
      isDetecting,
      connected,
      isConnecting,
      publicKey,
      network,
      error,
      connect,
      disconnect,
      refresh,
    ]
  );

  return (
    <FreighterContext.Provider value={value}>
      {children}
    </FreighterContext.Provider>
  );
}

export function useFreighter() {
  const context = useContext(FreighterContext);
  if (!context) {
    throw new Error("useFreighter must be used within FreighterProvider");
  }
  return context;
}
