import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Download | Shimeji AI Pets on Ethereum",
  description:
    "Download Shimeji AI Pets for browser and desktop to start using your AI companion locally.",
  path: "/download",
});

export default function DownloadPage() {
  return <DownloadClient />;
}
