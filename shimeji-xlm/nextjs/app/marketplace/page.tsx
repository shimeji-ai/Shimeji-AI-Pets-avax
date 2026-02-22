import type { Metadata } from "next";
import { MarketplaceHub } from "@/components/marketplace-hub";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Marketplace | Shimeji AI Pets on Stellar",
  description:
    "Explore listings and manage your Shimeji NFTs and artist profile on Stellar.",
  path: "/marketplace",
});

export default function MarketplacePage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <MarketplaceHub />
      <Footer />
    </main>
  );
}
