import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketplaceHub } from "@/components/marketplace-hub";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Settings | Shimeji AI Pets on Stellar",
  description:
    "Configure your wallet-based artist profile, listings, swaps, and commission operations.",
  path: "/settings",
});

export default function SettingsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <Suspense fallback={null}>
        <MarketplaceHub mode="settings" />
      </Suspense>
      <Footer />
    </main>
  );
}
