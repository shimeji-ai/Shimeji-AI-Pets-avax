import { Footer } from "~~/components/footer";
import { DownloadSection } from "~~/components/download-section";
import { NavHeader } from "~~/components/nav-header";

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
