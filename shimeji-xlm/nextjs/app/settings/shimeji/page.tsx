import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Shimeji Settings | Shimeji AI Pets",
  description: "Configure website shimeji settings in a dedicated page.",
  path: "/settings/shimeji",
});

export default function ShimejiSettingsPage() {
  redirect("/settings");
}
