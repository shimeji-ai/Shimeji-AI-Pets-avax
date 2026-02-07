"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type SubscriptionType = "updates" | "shimeji_request" | "collection_request";

interface EmailSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SubscriptionType;
  title: string;
  subtitle: string;
  buttonText?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSubscribeModal({
  isOpen,
  onClose,
  type,
  title,
  subtitle,
  buttonText = "Subscribe",
  metadata = {},
  onSuccess,
}: EmailSubscribeModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          type,
          metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      setIsSuccess(true);
      toast.success(data.message || "Successfully subscribed!");
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/10 mb-4 text-[var(--brand-accent)]">
            {isSuccess ? (
              <CheckCircle className="w-6 h-6 text-white" />
            ) : (
              <Mail className="w-6 h-6 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {isSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <Mail className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-700">Check your inbox!</p>
            <p className="text-sm text-green-600 mt-1">
              We sent you a confirmation email. Click the link to complete your subscription.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl bg-[#0b0f14] border border-white/10 focus:border-[var(--brand-accent)] focus:outline-none text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
              />
              {error && (
                <p className="text-sm text-red-500 mt-1.5 pl-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full neural-button py-6 text-lg rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Subscribing...
                </>
              ) : (
                buttonText
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
