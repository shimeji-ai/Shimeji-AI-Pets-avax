import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "~~/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Workshop | Shimeji AI Pets on Ethereum",
  description:
    "Workshop redirects to the Factory where you can reserve handcrafted Shimeji eggs.",
  path: "/workshop",
});

export default function WorkshopRedirectPage() {
  redirect("/factory");
}
