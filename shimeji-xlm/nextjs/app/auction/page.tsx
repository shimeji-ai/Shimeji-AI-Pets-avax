import type { Metadata } from "next";
import { AuctionSection } from "@/components/auction-section";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Auction | Shimeji AI Pets on Stellar",
  description:
    "Bid on handcrafted Shimeji NFT companions on Stellar with XLM or USDC.",
  path: "/auction",
});

export default function AuctionPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <AuctionSection />
      <Footer />
    </main>
  );
}

