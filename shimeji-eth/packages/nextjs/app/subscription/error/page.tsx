import SubscriptionErrorClient from "./SubscriptionErrorClient";

export default async function SubscriptionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <SubscriptionErrorClient searchParams={resolvedSearchParams} />;
}
