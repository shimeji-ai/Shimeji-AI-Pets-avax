import type { Metadata } from "next";
import MarketplaceArtistPage from "@/app/marketplace/artist/[wallet]/page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Profile | Shimeji AI Pets on Stellar",
  description: "Public artist and wallet profile for Shimeji AI Pets on Stellar.",
  path: "/profile",
});

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: Params) {
  const { id } = await params;
  return <MarketplaceArtistPage params={Promise.resolve({ wallet: id })} />;
}
