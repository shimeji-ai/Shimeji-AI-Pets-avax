"use client";

import dynamic from "next/dynamic";
import { WalletSessionContext, DEFAULT_WALLET_SESSION, useWalletSession } from "@/components/wallet-session-context";

const WalletProviderClient = dynamic(
  () => import("@/components/wallet-provider-client").then((mod) => mod.WalletProviderClient),
  {
    ssr: false,
  },
);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WalletSessionContext.Provider value={DEFAULT_WALLET_SESSION}>
      <WalletProviderClient>{children}</WalletProviderClient>
    </WalletSessionContext.Provider>
  );
}

export { useWalletSession };
