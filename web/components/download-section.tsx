"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmailSubscribeModal } from "@/components/email-subscribe-modal";
import { Download, Bell, Smartphone } from "lucide-react";

type Platform = "android" | "ios" | null;

export function DownloadSection() {
  const [notifyPlatform, setNotifyPlatform] = useState<Platform>(null);

  return (
    <section id="download" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10 mb-6 text-[var(--brand-accent)]">
            <Download className="w-8 h-8" />
          </div>
          <h2 className="text-5xl font-semibold mb-4">Download Shimeji.dev</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Install the extension and get an AI pet in your browser.
            Chat with it, let it react to your browsing, or connect it to
            onchain tools.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="neural-card rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4">Chrome Extension</h3>
            <div className="text-left mb-4">
              <p className="mb-2 text-muted-foreground">Follow these steps to install:</p>
              <div className="text-sm text-muted-foreground">
                Click download, unzip, then open `chrome://extensions` and load the folder.
              </div>
            </div>
            <Button asChild className="neural-button">
              <a href="/shimeji-chrome-extension.zip" download>
                Download Extension
              </a>
            </Button>
          </div>
          <div className="neural-card rounded-2xl p-8 text-center flex flex-col">
            <h3 className="text-2xl font-semibold mb-4">Android</h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 mx-auto mb-4 text-[var(--brand-accent)]">
                <Smartphone className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground mb-4">
                Android app coming soon! Get notified when it launches on the
                Google Play Store.
              </p>
            </div>
            <Button
              onClick={() => setNotifyPlatform("android")}
              className="neural-button"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify Me
            </Button>
          </div>
          <div className="neural-card rounded-2xl p-8 text-center flex flex-col">
            <h3 className="text-2xl font-semibold mb-4">iOS</h3>
            <div className="flex-1 flex flex-col justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 mx-auto mb-4 text-[var(--brand-accent)]">
                <Smartphone className="w-6 h-6" />
              </div>
              <p className="text-muted-foreground mb-4">
                iOS app coming soon! Get notified when it launches on the Apple
                App Store.
              </p>
            </div>
            <Button
              onClick={() => setNotifyPlatform("ios")}
              className="neural-button"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify Me
            </Button>
          </div>
        </div>
      </div>

      <EmailSubscribeModal
        isOpen={notifyPlatform === "android"}
        onClose={() => setNotifyPlatform(null)}
        type="updates"
        title="Android App Coming Soon!"
        subtitle="We'll notify you when the Android app is available"
        buttonText="Notify Me"
        metadata={{ platform: "android" }}
      />

      <EmailSubscribeModal
        isOpen={notifyPlatform === "ios"}
        onClose={() => setNotifyPlatform(null)}
        type="updates"
        title="iOS App Coming Soon!"
        subtitle="We'll notify you when the iOS app is available"
        buttonText="Notify Me"
        metadata={{ platform: "ios" }}
      />
    </section>
  );
}
