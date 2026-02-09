import dynamic from "next/dynamic";

const NavHeader = dynamic(() => import("~~/components/nav-header"), { ssr: false });
const DownloadSection = dynamic(() => import("~~/components/download-section"), {
  ssr: false,
  loading: () => <div className="min-h-[320px]" />,
});
const Footer = dynamic(() => import("~~/components/footer"), { ssr: false });

export default function DownloadPage() {
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
