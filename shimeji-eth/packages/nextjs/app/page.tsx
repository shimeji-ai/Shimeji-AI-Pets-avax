import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Shimeji AI Pets on Ethereum | Home",
  description:
    "Discover AI-powered desktop pets, setup guides, and Ethereum-connected features in Shimeji AI Pets.",
  path: "/",
});

export default function Home() {
  return <HomeClient />;
}
