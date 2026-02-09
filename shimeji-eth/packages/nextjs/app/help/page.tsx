import dynamic from "next/dynamic";

const NavHeader = dynamic(() => import("~~/components/nav-header"), { ssr: false });
const HelpSection = dynamic(() => import("~~/components/help-section"), {
  ssr: false,
  loading: () => <div className="min-h-[320px]" />,
});
const Footer = dynamic(() => import("~~/components/footer"), { ssr: false });

export default function HelpPage() {
  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <NavHeader />
      <HelpSection />
      <Footer />
    </main>
  );
}
