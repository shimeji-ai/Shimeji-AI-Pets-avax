import SubscriptionSuccessClient from "./SubscriptionSuccessClient";

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; already?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <SubscriptionSuccessClient searchParams={resolvedSearchParams} />;
}
