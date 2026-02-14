import type { Metadata } from "next";
import FactoryClient from "./FactoryClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Factory | Shimeji AI Pets on Ethereum",
  description:
    "Reserve a handcrafted Shimeji egg, set its intention, and connect with your Ethereum wallet.",
  path: "/factory",
});

export default function FactoryPage() {
  return <FactoryClient />;
}
