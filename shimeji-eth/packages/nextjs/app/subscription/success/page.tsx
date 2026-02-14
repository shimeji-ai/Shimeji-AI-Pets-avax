import type { Metadata } from "next";
import SubscriptionSuccessClient from "./SubscriptionSuccessClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Subscription Confirmed | Shimeji AI Pets on Ethereum",
  description:
    "Your Shimeji AI Pets subscription is confirmed. You'll receive updates about launches and new features.",
  path: "/subscription/success",
});

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; already?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <SubscriptionSuccessClient searchParams={resolvedSearchParams} />;
}
