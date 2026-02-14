import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Subscription Confirmed | Shimeji AI Pets on Stellar",
  description:
    "Your Shimeji AI Pets subscription was confirmed and you'll receive updates about new features and drops.",
  path: "/subscription/success",
});

export default function SubscriptionSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
