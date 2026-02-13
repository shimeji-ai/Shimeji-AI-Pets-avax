"use client";

import dynamic from "next/dynamic";

const NavHeader = dynamic(() => import("@/components/nav-header").then(m => m.NavHeader), { ssr: false });
const DownloadSection = dynamic(() => import("@/components/download-section").then(m => m.DownloadSection), {
  ssr: false,
  loading: () => <div className="min-h-[320px]" />,
});
const Footer = dynamic(() => import("@/components/footer").then(m => m.Footer), { ssr: false });

export default function DownloadClient() {
  return (
    <main className="min-h-screen neural-shell">
      <NavHeader />
      <div className="bg-transparent overflow-x-hidden">
        <DownloadSection />
      </div>
      <Footer />
    </main>
  );
}
