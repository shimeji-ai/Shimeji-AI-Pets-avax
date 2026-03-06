"use client";

import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider, lightTheme, useConnectModal } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  coreWallet,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, useAccount, useDisconnect, usePublicClient, useWalletClient } from "wagmi";
import { http } from "viem";
import {
  ACTIVE_CHAIN,
  RPC_URL,
  getAbiForContract,
  getAddressForContract,
  SHIMEJI_NETWORK,
} from "@/lib/contracts";
import { decodeTxRequest } from "@/lib/tx-request";
import { WalletSessionContext, type WalletSessionState } from "@/components/wallet-session-context";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";
const walletGroups = [
  {
    groupName: "Avalanche",
    wallets: [
      coreWallet,
      metaMaskWallet,
      coinbaseWallet,
      rabbyWallet,
      walletConnectWallet,
      injectedWallet,
    ],
  },
];

function WalletSessionInner({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id });
  const { openConnectModal } = useConnectModal();
  const [error, setError] = useState<string | null>(null);

  const value = useMemo<WalletSessionState>(() => {
    return {
      isAvailable: typeof window !== "undefined",
      isDetecting: false,
      isConnected,
      isConnecting,
      publicKey: address ?? null,
      network: chain?.name || SHIMEJI_NETWORK,
      error,
      connect: async () => {
        setError(null);
        if (!openConnectModal) {
          throw new Error("No wallet connector available.");
        }
        openConnectModal();
      },
      disconnect: () => {
        setError(null);
        disconnect();
      },
      refresh: async () => {
        setError(null);
      },
      signTransaction: async (serializedRequest: string) => {
        if (!walletClient || !publicClient || !address) {
          throw new Error("No wallet connected.");
        }
        const request = decodeTxRequest(serializedRequest);
        const hash = await walletClient.writeContract({
          address: getAddressForContract(request.contract),
          abi: getAbiForContract(request.contract),
          functionName: request.functionName,
          args: request.args,
          value: request.value,
          account: address,
          chain: ACTIVE_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      },
      signMessage: async (message: string) => {
        if (!walletClient || !address) {
          throw new Error("No wallet connected.");
        }
        const signedMessage = await walletClient.signMessage({
          account: address,
          message,
        });
        return { signedMessage, signerAddress: address };
      },
    };
  }, [address, chain?.name, disconnect, error, isConnected, isConnecting, openConnectModal, publicClient, walletClient]);

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function WalletProviderClient({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() =>
    getDefaultConfig({
      appName: "Shimeji AI Pets",
      projectId,
      chains: [ACTIVE_CHAIN],
      wallets: walletGroups,
      ssr: false,
      transports: {
        [ACTIVE_CHAIN.id]: http(RPC_URL),
      },
    }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={lightTheme({
            accentColor: "#ff6b35",
            accentColorForeground: "#ffffff",
            borderRadius: "large",
          })}
        >
          <WalletSessionInner>{children}</WalletSessionInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
