import type { Metadata } from "next";
import DownloadClient from "../download/DownloadClient";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Downloads | Shimeji AI Pets on Ethereum",
  description:
    "Get the latest Shimeji AI Pets downloads for browser and desktop runtimes.",
  path: "/downloads",
});

export default function DownloadsPage() {
  return <DownloadClient />;
}
