import type { Metadata } from "next";
import HelpClient from "./HelpClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Setup Guides | Shimeji AI Pets on Ethereum",
  description:
    "Configure OpenRouter, Ollama, or OpenClaw to power your Shimeji AI companion.",
  path: "/help",
});

export default function HelpPage() {
  return <HelpClient />;
}
