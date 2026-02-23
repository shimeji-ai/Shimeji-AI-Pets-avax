import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { fetchAuctions } from "@/lib/auction";
import { getArtistProfile, isValidWalletAddress } from "@/lib/artist-profiles-store";
import { fetchListings, fetchSwapBids, fetchSwapListings } from "@/lib/marketplace";
import { fetchNftTokensByIds } from "@/lib/nft-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ wallet: string }>;
};

function walletShort(value: string) {
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

export default async function MarketplaceArtistPage({ params }: Params) {
  const { wallet } = await params;
  const normalizedWallet = wallet.trim().toUpperCase();

  if (!isValidWalletAddress(normalizedWallet)) {
    notFound();
  }

  const [profile, allListings, allSwapListings, allSwapBids, auctions] = await Promise.all([
    getArtistProfile(normalizedWallet),
    fetchListings(),
    fetchSwapListings(),
    fetchSwapBids(),
    fetchAuctions({ includeEnded: false, limit: 200 }).catch(() => []),
  ]);

  const listings = allListings
    .filter((listing) => listing.active && listing.seller === normalizedWallet)
    .sort((a, b) => b.listingId - a.listingId);
  const tokenRecords = await fetchNftTokensByIds(listings.map((listing) => listing.tokenId));
  const tokenById = new Map(tokenRecords.map((token) => [token.tokenId, token]));

  const outgoingSwaps = allSwapListings
    .filter((swap) => swap.active && swap.creator === normalizedWallet)
    .sort((a, b) => b.listingId - a.listingId);
  const outgoingSwapListingById = new Map(outgoingSwaps.map((swap) => [swap.listingId, swap]));
  const incomingSwapBidsForListings = allSwapBids
    .filter((bid) => bid.active && outgoingSwapListingById.has(bid.listingId))
    .sort((a, b) => b.bidId - a.bidId);
  const itemAuctions = auctions
    .filter(
      (snapshot) =>
        snapshot.auction.isItemAuction &&
        snapshot.auction.seller === normalizedWallet,
    )
    .sort((a, b) => b.auctionId - a.auctionId);

  const hasCommissionCTA = Boolean(
    profile?.artistEnabled && profile?.commissionEnabled && profile?.acceptingNewClients,
  );
  const socialEntries = Object.entries(profile?.socialLinks || {});

  return (
    <main className="min-h-screen overflow-x-hidden neural-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-28 md:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-white/10 p-5 backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Artist / Artista
              </p>
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                {profile?.displayName || walletShort(normalizedWallet)}
              </h1>
              <p className="text-xs text-muted-foreground">{normalizedWallet}</p>
              {profile?.bio ? (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Artist profile page for this wallet. / Pagina de artista para esta wallet.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/marketplace/artist/${normalizedWallet}/collection`}
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                View collection
              </Link>
              <Link
                href="/marketplace/artists"
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                Artists index
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                Back to marketplace
              </Link>
              <Link
                href={`/marketplace?search=${encodeURIComponent(normalizedWallet)}`}
                className="inline-flex items-center justify-center rounded-md border border-border bg-white/5 px-3 py-2 text-sm text-foreground hover:bg-white/10"
              >
                Search seller
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs">Artist profile</p>
                  <p className="mt-1 font-medium text-foreground">
                    {profile?.artistEnabled ? "Enabled" : "Not enabled"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs">Commissions</p>
                  <p className="mt-1 font-medium text-foreground">
                    {profile?.commissionEnabled
                      ? profile.acceptingNewClients
                        ? "Open"
                        : "Closed"
                      : "Disabled"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs">Price</p>
                  <p className="mt-1 font-medium text-foreground">
                    {profile?.basePriceXlm ? `${profile.basePriceXlm} XLM` : "-"} /{" "}
                    {profile?.basePriceUsdc ? `${profile.basePriceUsdc} USDC` : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-xs">Turnaround</p>
                  <p className="mt-1 font-medium text-foreground">
                    {profile?.turnaroundDaysMin || profile?.turnaroundDaysMax
                      ? `${profile.turnaroundDaysMin ?? "?"}-${profile.turnaroundDaysMax ?? "?"} days`
                      : "-"}
                  </p>
                </div>
              </div>

              {profile?.languages?.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Languages: <span className="text-foreground">{profile.languages.join(", ")}</span>
                </p>
              ) : null}
              {profile?.styleTags?.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Styles: <span className="text-foreground">{profile.styleTags.join(", ")}</span>
                </p>
              ) : null}

              {socialEntries.length ? (
                <div className="mt-4 rounded-xl border border-border bg-white/5 p-3">
                  <p className="text-sm font-medium text-foreground">Social links / Redes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {socialEntries.map(([label, href]) => (
                      <a
                        key={`${label}:${href}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-foreground hover:bg-white/10"
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Commissioning / Comisiones
              </h2>
              {hasCommissionCTA ? (
                <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-foreground">
                  <p className="font-medium">This artist is accepting commissions.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buy a commission egg from this artist in the listings below to start the escrow-based
                    commission flow.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border bg-white/5 p-3 text-sm text-muted-foreground">
                  {profile?.artistEnabled
                    ? "Commissions are not open right now for this artist."
                    : "This wallet has not enabled a public artist profile yet."}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Public listings</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Fixed-price items currently listed by this wallet.
              </p>
              <div className="mt-3 space-y-2">
                {listings.map((listing) => {
                  const token = tokenById.get(listing.tokenId) ?? null;
                  const isCommissionEgg = listing.isCommissionEgg || Boolean(token?.isCommissionEgg);
                  return (
                    <div
                      key={`artist-listing-${listing.listingId}`}
                      className="rounded-xl border border-border bg-white/5 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/marketplace/shimeji/${listing.tokenId}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            #{listing.tokenId} · {isCommissionEgg ? "Commission Egg" : "Shimeji NFT"}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Listing #{listing.listingId}
                          </p>
                        </div>
                        <span className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-foreground">
                          active
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                        <div className="rounded-lg border border-border bg-white/5 p-2">
                          XLM: <span className="text-foreground">{formatTokenAmount(listing.priceXlm)}</span>
                        </div>
                        <div className="rounded-lg border border-border bg-white/5 p-2">
                          USDC: <span className="text-foreground">{formatTokenAmount(listing.priceUsdc)}</span>
                        </div>
                      </div>
                      {token?.tokenUri ? (
                        <p className="mt-2 break-all text-xs text-muted-foreground line-clamp-2">
                          URI: {token.tokenUri}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {listings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-center text-xs text-muted-foreground">
                    No active fixed-price listings for this artist.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Auctions / Subastas</h2>
              <div className="mt-3 space-y-2">
                {itemAuctions.map((snapshot) => (
                  <div
                    key={`artist-auction-${snapshot.auctionId}`}
                    className="rounded-xl border border-border bg-white/5 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          <Link
                            href={`/marketplace/shimeji/${snapshot.auction.tokenId}`}
                            className="hover:underline"
                          >
                            Auction #{snapshot.auctionId}
                            {snapshot.auction.tokenId !== null ? ` · token #${snapshot.auction.tokenId}` : ""}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ends at {new Date(snapshot.auction.endTime * 1000).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-foreground">
                        active
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                      <div className="rounded-lg border border-border bg-white/5 p-2">
                        XLM:{" "}
                        <span className="text-foreground">
                          {formatTokenAmount(snapshot.auction.startingPriceXlm)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-white/5 p-2">
                        USDC:{" "}
                        <span className="text-foreground">
                          {formatTokenAmount(snapshot.auction.startingPriceUsdc)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {itemAuctions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-white/5 p-4 text-sm text-muted-foreground">
                    No active item auctions for this artist right now.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/10 p-4">
              <h2 className="text-sm font-semibold text-foreground">Swap activity</h2>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p>Open swap listings</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{outgoingSwaps.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-white/5 p-3">
                  <p>Incoming swap bids</p>
                  <p className="mt-1 text-base font-semibold text-foreground">
                    {incomingSwapBidsForListings.length}
                  </p>
                </div>
              </div>
              {(outgoingSwaps.length || incomingSwapBidsForListings.length) ? (
                <div className="mt-3 space-y-2">
                  {outgoingSwaps.slice(0, 4).map((swap) => (
                    <div key={`artist-out-${swap.listingId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                      <span className="text-foreground">Listing #{swap.listingId}</span> offers NFT #{swap.offeredTokenId}
                    </div>
                  ))}
                  {incomingSwapBidsForListings.slice(0, 4).map((bid) => (
                    <div key={`artist-in-${bid.bidId}`} className="rounded-lg border border-border bg-white/5 p-2 text-xs text-muted-foreground">
                      <span className="text-foreground">Bid #{bid.bidId}</span> offers NFT #{bid.bidderTokenId} on swap listing #{bid.listingId}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
