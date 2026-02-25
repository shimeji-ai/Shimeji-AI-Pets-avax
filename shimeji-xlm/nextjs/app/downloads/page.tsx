import type { Metadata } from "next";
import DownloadClient from "../download/DownloadClient";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Downloads | Shimeji AI Pets",
  description:
    "Get the latest Shimeji AI Pets desktop and browser builds for a smooth Stellar experience.",
  path: "/downloads",
});

export default function DownloadsPage() {
  return <DownloadClient />;
}
