import SubscriptionErrorClient from "./SubscriptionErrorClient";

export default function SubscriptionErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return <SubscriptionErrorClient searchParams={searchParams} />;
}
