import type { Metadata } from "next";
import { PublicWalletProfilePage } from "@/components/public-wallet-profile-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Profile | Shimeji AI Pets",
  description: "Public wallet profile for Shimeji AI Pets.",
  path: "/profile",
});

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: Params) {
  const { id } = await params;
  return <PublicWalletProfilePage wallet={id} />;
}
