"use client";

import dynamic from "next/dynamic";

const NavHeader = dynamic(() => import("~~/components/nav-header").then(m => m.NavHeader), { ssr: false });
const HelpSection = dynamic(() => import("~~/components/help-section").then(m => m.HelpSection), {
  ssr: false,
  loading: () => <div className="min-h-[320px]" />,
});
const Footer = dynamic(() => import("~~/components/footer").then(m => m.Footer), { ssr: false });

export default function HelpClient() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader />
      <HelpSection />
      <Footer />
    </main>
  );
}
