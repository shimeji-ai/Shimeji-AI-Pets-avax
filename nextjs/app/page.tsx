import type { Metadata } from "next";
import { SiteMochiLandingSection } from "@/components/site-mochi-landing-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { FeaturesSection } from "@/components/features-section";
import { SubscribeSection } from "@/components/subscribe-section";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Mochi | Home",
  description:
    "Explore Mochi: animated companions, AI chat setup guides, and on-chain experiences.",
  path: "/",
});

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <SiteMochiLandingSection />
      <div className="bg-transparent">
        <FeaturesSection />
        <HowItWorksSection />
        <SubscribeSection />
      </div>
      <Footer />
    </main>
  );
}
