import type { Metadata } from "next";
import SubscriptionErrorClient from "./SubscriptionErrorClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Subscription Error | Shimeji AI Pets on Ethereum",
  description:
    "There was a problem confirming your subscription. Use this page to retry your Shimeji AI Pets confirmation flow.",
  path: "/subscription/error",
});

export default async function SubscriptionErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return <SubscriptionErrorClient searchParams={resolvedSearchParams} />;
}
