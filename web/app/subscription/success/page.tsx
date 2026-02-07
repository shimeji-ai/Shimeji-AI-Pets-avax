import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; already?: string }>;
}) {
  const params = await searchParams;
  const already = params.already === "true";

  const typeMessages: Record<string, string> = {
    updates: "project updates and new features",
    shimeji_request: "shimeji availability notifications",
    collection_request: "new collection announcements",
  };

  const message = params.type
    ? typeMessages[params.type] || "updates"
    : "updates";

  return (
    <main className="min-h-screen neural-shell flex items-center justify-center p-4">
      <div className="neural-card rounded-3xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/10 mb-6 text-[var(--brand-accent)]">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {already ? "Already Confirmed!" : "You're Subscribed!"}
        </h1>

        <p className="text-muted-foreground mb-6">
          {already
            ? `Your email was already confirmed. You'll receive ${message} from Shimeji AI Pets.`
            : `Thanks for confirming! You'll now receive ${message} from Shimeji AI Pets.`}
        </p>

        <Link href="/">
          <Button className="neural-button rounded-xl px-6">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  );
}
