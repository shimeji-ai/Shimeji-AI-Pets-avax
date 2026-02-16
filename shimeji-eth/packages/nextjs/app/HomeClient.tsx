"use client";

import dynamic from "next/dynamic";

const Header = dynamic(() => import("~~/components/header").then(m => m.Header), { ssr: false });
const HeroSection = dynamic(() => import("~~/components/hero-section").then(m => m.HeroSection), {
  ssr: false,
  loading: () => <div className="min-h-[420px]" />,
});
const HowItWorksSection = dynamic(() => import("~~/components/how-it-works-section").then(m => m.HowItWorksSection), {
  ssr: false,
  loading: () => <div className="min-h-[360px]" />,
});
const FeaturesSection = dynamic(() => import("~~/components/features-section").then(m => m.FeaturesSection), {
  ssr: false,
  loading: () => <div className="min-h-[360px]" />,
});
const SubscribeSection = dynamic(() => import("~~/components/subscribe-section").then(m => m.SubscribeSection), {
  ssr: false,
  loading: () => <div className="min-h-[260px]" />,
});
const FAQSection = dynamic(() => import("~~/components/faq-section").then(m => m.FAQSection), {
  ssr: false,
  loading: () => <div className="min-h-[260px]" />,
});
// const CtaSection = dynamic(() => import("~~/components/cta-section").then(m => m.CtaSection), {
//   ssr: false,
//   loading: () => <div className="min-h-[220px]" />,
// });
const Footer = dynamic(() => import("~~/components/footer").then(m => m.Footer), { ssr: false });
const GiveawayWidget = dynamic(() => import("~~/components/giveaway-widget").then(m => m.GiveawayWidget), {
  ssr: false,
});

export default function HomeClient() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <Header />
      <GiveawayWidget />
      <HeroSection />
      <div className="bg-transparent">
        <HowItWorksSection />
        <FeaturesSection />
        <SubscribeSection />
        <FAQSection />
        {/* <CtaSection /> */}
      </div>
      <Footer />
    </main>
  );
}
