import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Auction | Shimeji AI Pets on Stellar",
  description:
    "Place bids in the live Stellar auction with XLM or USDC, track the countdown, and verify the contract on-chain.",
  path: "/auction",
});

export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
