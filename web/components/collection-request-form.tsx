"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmailSubscribeModal } from "@/components/email-subscribe-modal";
import { Bell, Sparkles } from "lucide-react";

export function CollectionRequestForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="neural-card rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-[var(--brand-accent)]">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">Custom Shimeji Requests</h2>
          <p className="text-gray-700 text-sm mb-4">
            Soon you&apos;ll be able to request custom traits and behaviors for new
            shimejis. Subscribe to get notified when this feature launches!
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="neural-button rounded-xl px-6"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notify Me When Available
          </Button>
        </div>
      </div>

      <EmailSubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="collection_request"
        title="Coming Soon!"
        subtitle="We'll notify you when custom requests open"
        buttonText="Notify Me"
      />
    </div>
  );
}
