"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language-provider";

const TWITTER_USERNAME_REGEX = /^@?[A-Za-z0-9_]{1,15}$/;

type FeedbackStatus =
  | { type: "idle"; message: string }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export function SubscribeSection() {
  const { isSpanish } = useLanguage();
  const [feedback, setFeedback] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FeedbackStatus>({
    type: "idle",
    message: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanFeedback = feedback.trim();
    const cleanTwitterUsername = twitterUsername.trim();

    if (cleanFeedback.length < 8) {
      setStatus({
        type: "error",
        message: isSpanish
          ? "Por favor comparte al menos un comentario corto."
          : "Please share at least a short comment.",
      });
      return;
    }

    if (
      cleanTwitterUsername &&
      !TWITTER_USERNAME_REGEX.test(cleanTwitterUsername)
    ) {
      setStatus({
        type: "error",
        message: isSpanish
          ? "Ingresa un usuario válido de X o déjalo vacío."
          : "Please enter a valid X username or leave it empty.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus({ type: "idle", message: "" });

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: cleanFeedback,
          twitterUsername: cleanTwitterUsername || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus({
          type: "error",
          message:
            payload.error ||
            (isSpanish
              ? "No se pudo enviar el feedback ahora."
              : "Could not send feedback right now."),
        });
        return;
      }

      setFeedback("");
      setTwitterUsername("");
      setStatus({
        type: "success",
        message: isSpanish
          ? "¡Gracias! Tu feedback fue enviado."
          : "Thanks! Your feedback was sent.",
      });
    } catch (error) {
      console.error("Feedback submit error:", error);
      setStatus({
        type: "error",
        message: isSpanish
          ? "No se pudo enviar el feedback ahora."
          : "Could not send feedback right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="subscribe" className="py-12 md:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Follow on X */}
        <div className="neural-card rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--brand-accent)]">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">
                {isSpanish ? "Mantente al día" : "Stay in the Loop"}
              </h2>
              <p className="text-muted-foreground">
                {isSpanish
                  ? "Seguinos en X para enterarte de nuevas funciones y lanzamientos de la plataforma."
                  : "Follow us on X to stay updated on new features and platform launches."}
              </p>
            </div>
            <div className="flex-shrink-0">
              <a
                href="https://x.com/ShimejiAIPets"
                target="_blank"
                rel="noopener noreferrer"
                className="neural-button rounded-xl px-6 py-3 text-lg inline-flex items-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {isSpanish ? "Seguinos en X" : "Follow us on X"}
              </a>
            </div>
          </div>
        </div>

        {/* Feedback form */}
        <div className="neural-card rounded-3xl p-6 md:p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {isSpanish
              ? "¿Qué te parece este proyecto?"
              : "What do you think about this project?"}
          </h3>
          

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder={isSpanish ? "Comparte tu opinión..." : "Share your thoughts..."}
              className="w-full min-h-28 rounded-2xl border border-white/10 bg-[#0b0f14] p-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
              maxLength={1500}
              required
            />

            <input
              type="text"
              value={twitterUsername}
              onChange={(event) => setTwitterUsername(event.target.value)}
              placeholder={
                isSpanish
                  ? "Usuario de X (opcional) ej: @tuusuario"
                  : "X username (optional) e.g. @yourhandle"
              }
              className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="neural-button rounded-xl px-6"
              >
                {isSubmitting
                  ? isSpanish
                    ? "Enviando..."
                    : "Sending..."
                  : isSpanish
                    ? "Enviar feedback"
                    : "Send Feedback"}
              </Button>
            </div>
          </form>

          {status.message ? (
            <p
              className={`mt-4 text-sm ${
                status.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {status.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
