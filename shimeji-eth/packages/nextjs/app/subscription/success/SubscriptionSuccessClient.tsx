"use client";

import Link from "next/link";
import { CheckCircle, Home } from "lucide-react";
import { useLanguage } from "~~/components/language-provider";
import { Button } from "~~/components/ui/button";

type SubscriptionSuccessClientProps = {
  searchParams: { type?: string; already?: string };
};

export default function SubscriptionSuccessClient({ searchParams }: SubscriptionSuccessClientProps) {
  const { isSpanish } = useLanguage();
  const already = searchParams?.already === "true";

  const typeMessagesEn: Record<string, string> = {
    updates: "project updates and new features",
    shimeji_request: "shimeji availability notifications",
    collection_request: "new collection announcements",
  };

  const typeMessagesEs: Record<string, string> = {
    updates: "novedades del proyecto y nuevas funciones",
    shimeji_request: "avisos de disponibilidad de shimejis",
    collection_request: "anuncios de nuevas colecciones",
  };

  const message = searchParams?.type
    ? (isSpanish ? typeMessagesEs[searchParams.type] : typeMessagesEn[searchParams.type]) ||
      (isSpanish ? "novedades" : "updates")
    : isSpanish
      ? "novedades"
      : "updates";

  return (
    <main className="min-h-screen neural-shell flex items-center justify-center p-4">
      <div className="neural-card rounded-3xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/10 mb-6 text-[var(--brand-accent)]">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {already
            ? isSpanish
              ? "¡Ya estaba confirmado!"
              : "Already Confirmed!"
            : isSpanish
              ? "¡Suscripción confirmada!"
              : "You're Subscribed!"}
        </h1>

        <p className="text-muted-foreground mb-6">
          {already
            ? isSpanish
              ? `Tu email ya estaba confirmado. Vas a recibir ${message} de Shimeji AI Pets.`
              : `Your email was already confirmed. You'll receive ${message} from Shimeji AI Pets.`
            : isSpanish
              ? `¡Gracias por confirmar! Ahora vas a recibir ${message} de Shimeji AI Pets.`
              : `Thanks for confirming! You'll now receive ${message} from Shimeji AI Pets.`}
        </p>

        <Link href="/">
          <Button className="neural-button rounded-xl px-6">
            <Home className="w-4 h-4 mr-2" />
            {isSpanish ? "Volver al inicio" : "Back to Home"}
          </Button>
        </Link>
      </div>
    </main>
  );
}
