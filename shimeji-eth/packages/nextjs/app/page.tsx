import dynamic from "next/dynamic";

const Header = dynamic(() => import("~~/components/header"), { ssr: false });
const HeroSection = dynamic(() => import("~~/components/hero-section"), {
  ssr: false,
  loading: () => <div className="min-h-[420px]" />,
});
const HowItWorksSection = dynamic(() => import("~~/components/how-it-works-section"), {
  ssr: false,
  loading: () => <div className="min-h-[360px]" />,
});
const FeaturesSection = dynamic(() => import("~~/components/features-section"), {
  ssr: false,
  loading: () => <div className="min-h-[360px]" />,
});
const SubscribeSection = dynamic(() => import("~~/components/subscribe-section"), {
  ssr: false,
  loading: () => <div className="min-h-[260px]" />,
});
const FAQSection = dynamic(() => import("~~/components/faq-section"), {
  ssr: false,
  loading: () => <div className="min-h-[260px]" />,
});
const CtaSection = dynamic(() => import("~~/components/cta-section"), {
  ssr: false,
  loading: () => <div className="min-h-[220px]" />,
});
const Footer = dynamic(() => import("~~/components/footer"), { ssr: false });
const GiveawayWidget = dynamic(() => import("~~/components/giveaway-widget"), { ssr: false });

export default function Home() {
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
        <CtaSection />
      </div>
      <Footer />
    </main>
  );
}
