import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "NFT Collection | Shimeji AI Pets on Stellar",
  description:
    "Connect Freighter to view and manage your Shimeji NFT collection on Stellar.",
  path: "/collection",
});

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
