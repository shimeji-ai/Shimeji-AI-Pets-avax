import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | Shimeji AI Pets on Stellar",
  description:
    "Review how Shimeji AI Pets handles messages, local storage, and provider integrations.",
  path: "/privacy",
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
