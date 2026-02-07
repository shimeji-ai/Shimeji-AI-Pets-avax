import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default async function SubscriptionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;

  const errorMessages: Record<string, { title: string; message: string }> = {
    "missing-token": {
      title: "Invalid Link",
      message: "The confirmation link appears to be incomplete. Please try clicking the link from your email again.",
    },
    "invalid-token": {
      title: "Link Not Found",
      message: "This confirmation link is invalid or has already been used. If you need to subscribe again, please visit our website.",
    },
    "expired-token": {
      title: "Link Expired",
      message: "This confirmation link has expired. Please subscribe again to receive a new confirmation email.",
    },
    "service-error": {
      title: "Service Unavailable",
      message: "We're having trouble processing your request. Please try again later.",
    },
    "update-failed": {
      title: "Something Went Wrong",
      message: "We couldn't confirm your subscription. Please try again or contact support if the problem persists.",
    },
  };

  const error = errorMessages[params.reason || ""] || {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
  };

  return (
    <main className="min-h-screen neural-shell flex items-center justify-center p-4">
      <div className="neural-card rounded-3xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/10 mb-6 text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {error.title}
        </h1>

        <p className="text-muted-foreground mb-6">{error.message}</p>

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
