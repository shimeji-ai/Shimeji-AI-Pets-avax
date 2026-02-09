"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { EmailSubscribeModal } from "~~/components/email-subscribe-modal";
import { useLanguage } from "~~/components/language-provider";
import { Button } from "~~/components/ui/button";

interface UpdatesSubscribePopupProps {
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "ghost";
}

export function UpdatesSubscribePopup({ buttonClassName = "", buttonVariant = "default" }: UpdatesSubscribePopupProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isSpanish } = useLanguage();

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} variant={buttonVariant} className={buttonClassName}>
        <Bell className="w-4 h-4 mr-2" />
        {isSpanish ? "Suscribirme a novedades" : "Subscribe for Updates"}
      </Button>

      <EmailSubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="updates"
        title={isSpanish ? "Enterate de todo" : "Stay in the Loop"}
        subtitle={
          isSpanish ? "Recibí avisos de nuevas funciones y shimejis" : "Get notified about new features and shimejis"
        }
        buttonText={isSpanish ? "Suscribirme" : "Subscribe"}
      />
    </>
  );
}
