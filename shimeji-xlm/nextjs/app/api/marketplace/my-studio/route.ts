import { NextRequest, NextResponse } from "next/server";
import { getArtistProfile, isValidWalletAddress } from "@/lib/artist-profiles-store";
import type {
  MarketplaceMyStudioResponse,
  MyStudioCommissionOrderItem,
  MyStudioListingItem,
  MyStudioSwapOfferItem,
} from "@/lib/marketplace-hub-types";
import { fetchCommissionOrders, fetchListings, fetchSwapOffers } from "@/lib/marketplace";
import { fetchNftTokensByIds, fetchOwnedNftsByWallet } from "@/lib/nft-read";

export const runtime = "nodejs";

function serializeOrder(order: Awaited<ReturnType<typeof fetchCommissionOrders>>[number]): MyStudioCommissionOrderItem {
  return {
    orderId: order.orderId,
    buyer: order.buyer,
    seller: order.seller,
    listingId: order.listingId,
    tokenId: order.tokenId,
    currency: String(order.currency),
    amountPaid: order.amountPaid.toString(),
    intention: order.intention,
    referenceImageUrl: order.referenceImageUrl,
    status: order.status,
    fulfilled: order.fulfilled,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    resolvedAt: order.resolvedAt,
  };
}

export async function GET(request: NextRequest) {
  const wallet = (request.nextUrl.searchParams.get("wallet") || "").trim().toUpperCase();
  const totalCapParam = Number.parseInt(request.nextUrl.searchParams.get("totalCap") || "250", 10);
  const totalCap = Number.isFinite(totalCapParam) ? Math.max(1, Math.min(totalCapParam, 1000)) : 250;

  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json(
      { error: "A valid Stellar wallet address is required." },
      { status: 400 },
    );
  }

  try {
    const [profile, ownedNfts, listings, commissionOrders, swapOffers] = await Promise.all([
      getArtistProfile(wallet),
      fetchOwnedNftsByWallet(wallet, { totalCap }),
      fetchListings(),
      fetchCommissionOrders(),
      fetchSwapOffers(),
    ]);

    const myListingsRaw = listings.filter((listing) => listing.seller === wallet && listing.active);
    const missingTokenIds = myListingsRaw
      .map((listing) => listing.tokenId)
      .filter((tokenId) => !ownedNfts.some((token) => token.tokenId === tokenId));
    const extraTokens = await fetchNftTokensByIds(missingTokenIds);
    const tokenById = new Map(
      [...ownedNfts, ...extraTokens].map((token) => [token.tokenId, token]),
    );

    const myListings: MyStudioListingItem[] = myListingsRaw.map((listing) => {
      const token = tokenById.get(listing.tokenId) ?? null;
      return {
        listingId: listing.listingId,
        seller: listing.seller,
        tokenId: listing.tokenId,
        tokenUri: token?.tokenUri ?? null,
        isCommissionEgg: listing.isCommissionEgg || Boolean(token?.isCommissionEgg),
        priceXlm: listing.priceXlm.toString(),
        priceUsdc: listing.priceUsdc.toString(),
        xlmUsdcRate: listing.xlmUsdcRate.toString(),
        active: listing.active,
      };
    });

    const myCommissionOrdersAsArtist = commissionOrders
      .filter((order) => order.seller === wallet)
      .map(serializeOrder)
      .sort((a, b) => b.createdAt - a.createdAt);

    const myCommissionOrdersAsBuyer = commissionOrders
      .filter((order) => order.buyer === wallet)
      .map(serializeOrder)
      .sort((a, b) => b.createdAt - a.createdAt);

    const ownedTokenIds = new Set(ownedNfts.map((token) => token.tokenId));
    const myOutgoingSwapOffers: MyStudioSwapOfferItem[] = swapOffers
      .filter((offer) => offer.offerer === wallet)
      .map((offer) => ({
        swapId: offer.swapId,
        offerer: offer.offerer,
        offeredTokenId: offer.offeredTokenId,
        desiredTokenId: offer.desiredTokenId,
        intention: offer.intention,
        active: offer.active,
        direction: "outgoing" as const,
      }))
      .sort((a, b) => b.swapId - a.swapId);

    const incomingSwapOffersForMyNfts: MyStudioSwapOfferItem[] = swapOffers
      .filter((offer) => offer.offerer !== wallet && ownedTokenIds.has(offer.desiredTokenId))
      .map((offer) => ({
        swapId: offer.swapId,
        offerer: offer.offerer,
        offeredTokenId: offer.offeredTokenId,
        desiredTokenId: offer.desiredTokenId,
        intention: offer.intention,
        active: offer.active,
        direction: "incoming" as const,
      }))
      .sort((a, b) => b.swapId - a.swapId);

    const activeCommissionEggListing = myListings.find((listing) => listing.isCommissionEgg && listing.active) ?? null;
    const blockingCommissionOrderAsArtist =
      myCommissionOrdersAsArtist.find(
        (order) => order.status !== "Completed" && order.status !== "Refunded",
      ) ?? null;
    const commissionEggLock =
      activeCommissionEggListing
        ? {
            canListNewCommissionEgg: false,
            reason: `You already have an active commission egg listing (#${activeCommissionEggListing.listingId}).`,
            activeCommissionEggListingId: activeCommissionEggListing.listingId,
            blockingOrderId: null,
          }
        : blockingCommissionOrderAsArtist
          ? {
              canListNewCommissionEgg: false,
              reason: `Finish or refund commission order #${blockingCommissionOrderAsArtist.orderId} before listing another commission egg.`,
              activeCommissionEggListingId: null,
              blockingOrderId: blockingCommissionOrderAsArtist.orderId,
            }
          : {
              canListNewCommissionEgg: true,
              reason: null,
              activeCommissionEggListingId: null,
              blockingOrderId: null,
            };

    const response: MarketplaceMyStudioResponse = {
      wallet,
      profile,
      ownedNfts: ownedNfts.map((token) => ({
        tokenId: token.tokenId,
        tokenUri: token.tokenUri,
        isCommissionEgg: token.isCommissionEgg,
      })),
      myListings,
      myCommissionOrdersAsArtist,
      myCommissionOrdersAsBuyer,
      myOutgoingSwapOffers,
      incomingSwapOffersForMyNfts,
      commissionEggLock,
      auctionCapability: {
        itemAuctionsAvailable: true,
        reason:
          "Per-item NFT auctions are available on-chain. Commission-egg auctions should continue using fixed-price + escrow for now.",
      },
      generatedAt: Date.now(),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Marketplace my-studio API error:", error);
    return NextResponse.json(
      { error: "Failed to load studio data." },
      { status: 500 },
    );
  }
}
