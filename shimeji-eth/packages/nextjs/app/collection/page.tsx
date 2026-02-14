import type { Metadata } from "next";
import CollectionClient from "./CollectionClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "NFT Collection | Shimeji AI Pets on Ethereum",
  description:
    "Connect your Ethereum wallet and manage your Shimeji NFT collection from one place.",
  path: "/collection",
});

export default function CollectionPage() {
  return <CollectionClient />;
}
