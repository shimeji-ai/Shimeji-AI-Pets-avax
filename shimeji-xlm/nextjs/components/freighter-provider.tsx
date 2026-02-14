"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE, STELLAR_NETWORK } from "@/lib/contracts";

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
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<string>;
};

const FreighterContext = createContext<FreighterState | null>(null);

const WALLET_ID_STORAGE_KEY = "shimeji_wallet_kit_id";
const WALLET_ADDRESS_STORAGE_KEY = "shimeji_wallet_kit_address";
const DEFAULT_CONNECTION_ERROR = "Connection request was rejected or failed.";
const DEFAULT_READ_ERROR = "Unable to read wallet connection.";
const NO_WALLET_SELECTED_ERROR = "No wallet selected.";

function walletIsReachable(wallet: { isAvailable: boolean; isPlatformWrapper?: boolean }) {
  return wallet.isAvailable || Boolean(wallet.isPlatformWrapper);
}

function hasWindow() {
  return typeof window !== "undefined";
}

function getStoredWalletId(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(WALLET_ID_STORAGE_KEY);
}

function getStoredWalletAddress(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(WALLET_ADDRESS_STORAGE_KEY);
}

function persistConnection(walletId: string, address: string) {
  if (!hasWindow()) return;
  window.localStorage.setItem(WALLET_ID_STORAGE_KEY, walletId);
  window.localStorage.setItem(WALLET_ADDRESS_STORAGE_KEY, address);
}

function clearPersistedConnection() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(WALLET_ID_STORAGE_KEY);
  window.localStorage.removeItem(WALLET_ADDRESS_STORAGE_KEY);
}

function normalizeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim().length > 0) return err;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

function toWalletNetwork(): WalletNetwork {
  if (
    STELLAR_NETWORK === "mainnet" ||
    NETWORK_PASSPHRASE === WalletNetwork.PUBLIC
  ) {
    return WalletNetwork.PUBLIC;
  }
  if (
    STELLAR_NETWORK === "local" ||
    NETWORK_PASSPHRASE === WalletNetwork.STANDALONE
  ) {
    return WalletNetwork.STANDALONE;
  }
  if (NETWORK_PASSPHRASE === WalletNetwork.FUTURENET) {
    return WalletNetwork.FUTURENET;
  }
  if (NETWORK_PASSPHRASE === WalletNetwork.SANDBOX) {
    return WalletNetwork.SANDBOX;
  }
  return WalletNetwork.TESTNET;
}

export function FreighterProvider({ children }: { children: React.ReactNode }) {
  const kit = useMemo(
    () =>
      new StellarWalletsKit({
        network: toWalletNetwork(),
        modules: allowAllModules(),
      }),
    []
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const wallets = await kit.getSupportedWallets();
      const anyAvailable = wallets.some((wallet) => walletIsReachable(wallet));
      setIsAvailable(anyAvailable);

      const storedWalletId = getStoredWalletId();
      const storedAddress = getStoredWalletAddress();
      const storedWalletAvailable = wallets.some(
        (wallet) => wallet.id === storedWalletId && walletIsReachable(wallet)
      );

      if (!storedWalletId || !storedAddress || !storedWalletAvailable) {
        setConnected(false);
        setPublicKey(null);
        setNetwork(null);
        setError(null);
        return;
      }

      try {
        kit.setWallet(storedWalletId);
      } catch {
        clearPersistedConnection();
        setConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      setConnected(true);
      setPublicKey(storedAddress);

      try {
        const walletNetwork = await kit.getNetwork();
        setNetwork(walletNetwork.network || walletNetwork.networkPassphrase || null);
      } catch {
        setNetwork(null);
      }

      setError(null);
    } catch (err) {
      console.error("Wallet refresh error:", err);
      setError(DEFAULT_READ_ERROR);
    }
  }, [kit]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (cb: () => void) => {
          if (settled) return;
          settled = true;
          cb();
        };

        kit
          .openModal({
            modalTitle: "Select wallet",
            notAvailableText:
              "No compatible wallet detected. On mobile, open this site inside your wallet app browser (for example Lobstr).",
            onWalletSelected: (option: ISupportedWallet) => {
              void (async () => {
                kit.setWallet(option.id);
                const { address } = await kit.getAddress();
                persistConnection(option.id, address);
                setIsAvailable(true);
                setConnected(true);
                setPublicKey(address);

                try {
                  const walletNetwork = await kit.getNetwork();
                  setNetwork(walletNetwork.network || walletNetwork.networkPassphrase || null);
                } catch {
                  setNetwork(null);
                }

                setError(null);
                settle(resolve);
              })().catch((walletErr) => settle(() => reject(walletErr)));
            },
            onClosed: () => settle(() => reject(new Error(DEFAULT_CONNECTION_ERROR))),
          })
          .catch((modalErr) => settle(() => reject(modalErr)));
      });
    } catch (err) {
      console.error("Wallet connect error:", err);
      setError(normalizeError(err, DEFAULT_CONNECTION_ERROR));
    } finally {
      setIsConnecting(false);
    }
  }, [kit]);

  const signTransaction = useCallback(
    async (
      xdr: string,
      opts?: { networkPassphrase?: string; address?: string }
    ): Promise<string> => {
      const walletId = getStoredWalletId();
      if (!walletId) {
        throw new Error(NO_WALLET_SELECTED_ERROR);
      }

      kit.setWallet(walletId);
      const signerAddress = opts?.address ?? publicKey ?? getStoredWalletAddress() ?? undefined;
      const signed = await kit.signTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase,
        address: signerAddress,
      });
      if (!signed?.signedTxXdr) {
        throw new Error(DEFAULT_CONNECTION_ERROR);
      }
      return signed.signedTxXdr;
    },
    [kit, publicKey]
  );

  const disconnect = useCallback(() => {
    void kit.disconnect().catch(() => {
      // Ignore disconnect failures; we still clear local app session.
    });
    clearPersistedConnection();
    setConnected(false);
    setPublicKey(null);
    setNetwork(null);
    setError(null);
  }, [kit]);

  // Retry detection to handle wallet extensions/providers loading late.
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Try up to 4 times: 0ms, 500ms, 1500ms, 3500ms
      const delays = [0, 500, 1000, 2000];
      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        await refresh();

        const wallets = await kit.getSupportedWallets();
        if (wallets.some((wallet) => walletIsReachable(wallet))) {
          if (!cancelled) {
            setIsDetecting(false);
          }
          return;
        }
      }
      if (!cancelled) {
        setIsDetecting(false);
      }
    }

    detect().catch(() => {
      if (!cancelled) {
        setIsAvailable(false);
        setIsDetecting(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [kit, refresh]);

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
      signTransaction,
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
      signTransaction,
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
