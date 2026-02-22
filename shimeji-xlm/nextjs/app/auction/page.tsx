import type { Metadata } from "next";
import { MarketplaceSection } from "@/components/marketplace-section";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Marketplace | Shimeji AI Pets on Stellar",
  description:
    "Buy, auction, and swap Shimeji NFT companions on Stellar with XLM or USDC.",
  path: "/auction",
});

export default function AuctionPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <MarketplaceSection />
      <Footer />
    </main>
  );
}
