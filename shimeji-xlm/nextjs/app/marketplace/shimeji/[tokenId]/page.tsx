import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { fetchAuctions } from "@/lib/auction";
import { getArtistProfilesByWallets } from "@/lib/artist-profiles-store";
import type { ArtistProfile } from "@/lib/marketplace-hub-types";
import { fetchListings, fetchSwapOffers } from "@/lib/marketplace";
import { fetchNftTokenById } from "@/lib/nft-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ tokenId: string }>;
};

function walletShort(value: string | null | undefined) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTokenAmount(rawUnits: bigint | null | undefined) {
  if (rawUnits === null || rawUnits === undefined) return "-";
  const scale = BigInt(10_000_000);
  const zero = BigInt(0);
  const sign = rawUnits < zero ? "-" : "";
  const abs = rawUnits < zero ? -rawUnits : rawUnits;
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(7, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

function timeLeftLabel(endTimeSeconds: number | null | undefined) {
  if (!endTimeSeconds) return "-";
  const delta = endTimeSeconds - Math.floor(Date.now() / 1000);
  if (delta <= 0) return "Ended";
  const days = Math.floor(delta / 86400);
  const hours = Math.floor((delta % 86400) / 3600);
  const minutes = Math.floor((delta % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export default async function MarketplaceShimejiPage({ params }: Params) {
  const { tokenId } = await params;
  const parsedTokenId = Number.parseInt(tokenId, 10);
  if (!Number.isInteger(parsedTokenId) || parsedTokenId < 0) {
    notFound();
  }

  const token = await fetchNftTokenById(parsedTokenId);
  if (!token) {
    notFound();
  }

  const [allListings, allSwaps, auctions] = await Promise.all([
    fetchListings(),
    fetchSwapOffers(),
    fetchAuctions({ includeEnded: false, limit: 300 }).catch(() => []),
  ]);

  const activeListing =
    allListings.find((listing) => listing.active && listing.tokenId === parsedTokenId) ?? null;
  const swapsOfferingThis = allSwaps
    .filter((swap) => swap.active && swap.offeredTokenId === parsedTokenId)
    .sort((a, b) => b.swapId - a.swapId);
  const swapsTargetingThis = allSwaps
    .filter((swap) => swap.active && swap.desiredTokenId === parsedTokenId)
    .sort((a, b) => b.swapId - a.swapId);

  const itemAuction =
    auctions.find(
      (snapshot) =>
        snapshot.auction.isItemAuction && snapshot.auction.tokenId === parsedTokenId,
    ) ?? null;
  const globalLiveAuction =
    auctions.find((snapshot) => !snapshot.auction.isItemAuction) ?? null;
  const liveAuctionMatchesByTokenUri = Boolean(
    globalLiveAuction &&
      globalLiveAuction.auction.tokenUri &&
      globalLiveAuction.auction.tokenUri === token.tokenUri,
  );

  const profilesByWallet: Record<string, ArtistProfile> = await getArtistProfilesByWallets(
    [token.owner, activeListing?.seller || "", ...swapsOfferingThis.map((swap) => swap.offerer)].filter(Boolean),
  ).catch(() => ({}));

  const ownerProfile = profilesByWallet[token.owner] ?? null;
  const listingSellerProfile = activeListing ? (profilesByWallet[activeListing.seller] ?? null) : null;

  const saleStatusLabel = activeListing ? "Listed for sale" : "Not listed for fixed price";
  const auctionStatusLabel = itemAuction
    ? `In item auction #${itemAuction.auctionId}`
    : liveAuctionMatchesByTokenUri
      ? "In global live auction (matched by token URI)"
      : "No active auction";
  const swapStatusLabel =
    swapsOfferingThis.length || swapsTargetingThis.length
      ? `${swapsOfferingThis.length} outgoing / ${swapsTargetingThis.length} incoming`
      : "No active swap offers";

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-28 md:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-white/10 p-5 backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Shimeji / NFT
              </p>
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                #{token.tokenId} · {token.isCommissionEgg ? "Commission Egg" : "Shimeji NFT"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Owner:{" "}
                <Link
                  href={`/marketplace/artist/${token.owner}`}
                  className="text-foreground underline underline-offset-2"
                >
                  {ownerProfile?.displayName || walletShort(token.owner)}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                Back to marketplace
              </Link>
              <Link
                href={`/marketplace?search=${encodeURIComponent(String(token.tokenId))}`}
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                Search in feed
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Availability status</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs text-muted-foreground">Sale / Venta</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{saleStatusLabel}</p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs text-muted-foreground">Auction / Subasta</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{auctionStatusLabel}</p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs text-muted-foreground">Swaps / Intercambios</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{swapStatusLabel}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Token metadata</h2>
              <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-sm">
                <p className="text-muted-foreground">Token URI</p>
                <p className="mt-1 break-all text-foreground">{token.tokenUri || "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Swap offers / Intercambios</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">Offering this token</p>
                  <div className="mt-2 space-y-2">
                    {swapsOfferingThis.slice(0, 8).map((swap) => (
                      <div key={`offer-${swap.swapId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <p>
                          <span className="text-foreground">#{swap.swapId}</span> by{" "}
                          <Link
                            href={`/marketplace/artist/${swap.offerer}`}
                            className="text-foreground underline underline-offset-2"
                          >
                            {profilesByWallet[swap.offerer]?.displayName || walletShort(swap.offerer)}
                          </Link>
                        </p>
                        <p>
                          Wants token <span className="text-foreground">#{swap.desiredTokenId}</span>
                        </p>
                        {swap.intention ? <p className="mt-1 line-clamp-2">{swap.intention}</p> : null}
                      </div>
                    ))}
                    {swapsOfferingThis.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No active offers using this token.</p>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs font-medium text-foreground">Targeting this token</p>
                  <div className="mt-2 space-y-2">
                    {swapsTargetingThis.slice(0, 8).map((swap) => (
                      <div key={`target-${swap.swapId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                        <p>
                          <span className="text-foreground">#{swap.swapId}</span> offers token{" "}
                          <span className="text-foreground">#{swap.offeredTokenId}</span>
                        </p>
                        <p>
                          by{" "}
                          <Link
                            href={`/marketplace/artist/${swap.offerer}`}
                            className="text-foreground underline underline-offset-2"
                          >
                            {profilesByWallet[swap.offerer]?.displayName || walletShort(swap.offerer)}
                          </Link>
                        </p>
                        {swap.intention ? <p className="mt-1 line-clamp-2">{swap.intention}</p> : null}
                      </div>
                    ))}
                    {swapsTargetingThis.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active swap offers targeting this token.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Fixed-price listing</h2>
              {activeListing ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="rounded-xl border border-border bg-white/5 p-3">
                    <p className="text-xs text-muted-foreground">Listing ID</p>
                    <p className="mt-1 font-medium text-foreground">#{activeListing.listingId}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground">Price XLM</p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatTokenAmount(activeListing.priceXlm)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground">Price USDC</p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatTokenAmount(activeListing.priceUsdc)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seller:{" "}
                    <Link
                      href={`/marketplace/artist/${activeListing.seller}`}
                      className="text-foreground underline underline-offset-2"
                    >
                      {listingSellerProfile?.displayName || walletShort(activeListing.seller)}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Buy from the main marketplace card actions or your marketplace UI.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-white/5 p-4 text-sm text-muted-foreground">
                  This token is not listed for fixed price right now.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Live auction</h2>
              {itemAuction ? (
                <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-sm">
                  <p className="text-foreground">
                    Item auction #{itemAuction.auctionId} is active for this token.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Time left: <span className="text-foreground">{timeLeftLabel(itemAuction.auction.endTime)}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Current bid:{" "}
                      <span className="text-foreground">
                        {itemAuction.highestBid
                          ? `${formatTokenAmount(itemAuction.highestBid.amount)} ${itemAuction.highestBid.currency === "Usdc" ? "USDC" : "XLM"}`
                          : "No bids"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Start XLM:{" "}
                      <span className="text-foreground">{formatTokenAmount(itemAuction.auction.startingPriceXlm)}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Start USDC:{" "}
                      <span className="text-foreground">{formatTokenAmount(itemAuction.auction.startingPriceUsdc)}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This NFT page includes the auction status and pricing details.
                  </p>
                  <Link
                    href="/marketplace"
                    className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
                  >
                    Open marketplace
                  </Link>
                </div>
              ) : globalLiveAuction ? (
                <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-sm">
                  <p className="text-foreground">
                    A live auction is active
                    {liveAuctionMatchesByTokenUri ? " and its token URI matches this NFT." : "."}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Auction ID: <span className="text-foreground">#{globalLiveAuction.auctionId}</span>
                    </div>
                    <div className="rounded-lg border border-border bg-white/5 p-2">
                      Time left: <span className="text-foreground">{timeLeftLabel(globalLiveAuction.auction.endTime)}</span>
                    </div>
                  </div>
                  <Link
                    href="/marketplace"
                    className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
                  >
                    Open marketplace
                  </Link>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-white/5 p-4 text-sm text-muted-foreground">
                  No live auction is active right now.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Artist / Owner</h2>
              <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {ownerProfile?.displayName || walletShort(token.owner)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{token.owner}</p>
                {ownerProfile?.artistEnabled ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Public artist profile enabled
                    {ownerProfile.commissionEnabled
                      ? ownerProfile.acceptingNewClients
                        ? " · commissions open"
                        : " · commissions closed"
                      : " · commissions disabled"}
                  </p>
                ) : null}
                <Link
                  href={`/marketplace/artist/${token.owner}`}
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
                >
                  View artist page
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
