import type { Metadata } from "next";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | Shimeji AI Pets on Ethereum",
  description:
    "Read how Shimeji AI Pets stores settings, processes messages, and handles provider integrations.",
  path: "/privacy",
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
