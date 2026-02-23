"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useFreighter } from "@/components/freighter-provider";
import { useLanguage } from "@/components/language-provider";
import { buildCreateItemAuctionTx } from "@/lib/auction";
import {
  buildCreateSwapListingTx,
  buildListCommissionEggTx,
  buildListForSaleTx,
} from "@/lib/marketplace";
import { getServer, NETWORK_PASSPHRASE } from "@/lib/contracts";

type Props = {
  tokenId: number;
  tokenOwner: string;
  isCommissionEgg: boolean;
  hasActiveListing: boolean;
  hasActiveAuction: boolean;
};

const TOKEN_SCALE = BigInt(10_000_000);
const DEFAULT_XLM_USDC_RATE = BigInt(1_600_000);

function parseAmountToUnits(value: string, invalidFormatMessage = "Invalid amount format"): bigint {
  const trimmed = value.trim();
  if (!trimmed) return BigInt(0);
  if (!/^\d+(\.\d{0,7})?$/.test(trimmed)) {
    throw new Error(invalidFormatMessage);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const fracPadded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole) * TOKEN_SCALE + BigInt(fracPadded);
}

function computeRate(priceXlm: bigint, priceUsdc: bigint): bigint {
  if (priceXlm > BigInt(0) && priceUsdc > BigInt(0)) {
    return (priceUsdc * TOKEN_SCALE) / priceXlm;
  }
  return DEFAULT_XLM_USDC_RATE;
}

async function signAndSubmitXdr(
  txXdr: string,
  signTransaction: ReturnType<typeof useFreighter>["signTransaction"],
  address: string,
) {
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const signedXdr = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  await server.sendTransaction(tx);
}

export function MarketplaceNftOwnerActions({
  tokenId,
  tokenOwner,
  isCommissionEgg,
  hasActiveListing,
  hasActiveAuction,
}: Props) {
  const router = useRouter();
  const { publicKey, isConnected, signTransaction } = useFreighter();
  const { isSpanish } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [salePriceXlm, setSalePriceXlm] = useState("");
  const [salePriceUsdc, setSalePriceUsdc] = useState("");
  const [commissionEtaDays, setCommissionEtaDays] = useState("7");

  const [auctionPriceXlm, setAuctionPriceXlm] = useState("");
  const [auctionPriceUsdc, setAuctionPriceUsdc] = useState("");
  const [auctionDurationHours, setAuctionDurationHours] = useState("24");
  const [swapIntention, setSwapIntention] = useState("");

  const isOwner = Boolean(publicKey && publicKey === tokenOwner);
  const t = (en: string, es: string) => (isSpanish ? es : en);

  async function submitListing() {
    if (!publicKey || !isOwner) return;
    setBusy("sale");
    setMessage("");
    try {
      const invalidAmountMessage = t("Invalid amount format", "Formato de monto inválido");
      const priceXlm = parseAmountToUnits(salePriceXlm, invalidAmountMessage);
      const priceUsdc = parseAmountToUnits(salePriceUsdc, invalidAmountMessage);
      if (priceXlm <= BigInt(0) && priceUsdc <= BigInt(0)) {
        throw new Error(t("Set an XLM or USDC price.", "Definí un precio en XLM o USDC."));
      }
      const rate = computeRate(priceXlm, priceUsdc);
      const etaDays = Math.max(1, Number.parseInt(commissionEtaDays || "7", 10) || 7);
      const txXdr = isCommissionEgg
        ? await buildListCommissionEggTx(publicKey, tokenId, priceXlm, priceUsdc, rate, etaDays)
        : await buildListForSaleTx(publicKey, tokenId, priceXlm, priceUsdc, rate);
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setMessage(t("Sale listing created.", "Publicación de venta creada."));
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("Failed to create sale listing.", "No se pudo crear la publicación de venta."),
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitAuction() {
    if (!publicKey || !isOwner) return;
    setBusy("auction");
    setMessage("");
    try {
      if (isCommissionEgg) {
        throw new Error(
          t(
            "Commission eggs should use fixed-price listing.",
            "Los huevos de comisión deben usar venta a precio fijo.",
          ),
        );
      }
      const invalidAmountMessage = t("Invalid amount format", "Formato de monto inválido");
      const priceXlm = parseAmountToUnits(auctionPriceXlm, invalidAmountMessage);
      const priceUsdc = parseAmountToUnits(auctionPriceUsdc, invalidAmountMessage);
      if (priceXlm <= BigInt(0) && priceUsdc <= BigInt(0)) {
        throw new Error(
          t("Set an XLM or USDC starting price.", "Definí un precio inicial en XLM o USDC."),
        );
      }
      const durationHours = Math.max(1, Number.parseInt(auctionDurationHours || "24", 10) || 24);
      const txXdr = await buildCreateItemAuctionTx(
        publicKey,
        tokenId,
        priceXlm,
        priceUsdc,
        computeRate(priceXlm, priceUsdc),
        durationHours * 3600,
      );
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setMessage(t("Auction created.", "Subasta creada."));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Failed to create auction.", "No se pudo crear la subasta."));
    } finally {
      setBusy(null);
    }
  }

  async function submitSwapListing() {
    if (!publicKey || !isOwner) return;
    setBusy("swap");
    setMessage("");
    try {
      if (!swapIntention.trim()) {
        throw new Error(t("Add the swap intention first.", "Primero agregá la intención de intercambio."));
      }
      const txXdr = await buildCreateSwapListingTx(publicKey, tokenId, swapIntention.trim());
      await signAndSubmitXdr(txXdr, signTransaction, publicKey);
      setMessage(t("Open swap listing created.", "Publicación de intercambio abierta creada."));
      setSwapIntention("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("Failed to create swap listing.", "No se pudo crear la publicación de intercambio."),
      );
    } finally {
      setBusy(null);
    }
  }

  if (!isConnected || !publicKey) return null;

  if (!isOwner) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-white/10 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t("Manage this NFT", "Gestionar este NFT")}</h2>
        <p className="text-xs text-muted-foreground">
          {t(
            "Create a sale, auction, or open swap listing from here.",
            "Creá una venta, subasta o intercambio abierto desde acá.",
          )}
        </p>
        {isCommissionEgg ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Commission eggs use 50/50 escrow (upfront + final release), buyer approval, and up to 3 change requests.",
              "Los huevos de comisión usan escrow 50/50 (anticipo + liberación final), aprobación del comprador y hasta 3 pedidos de cambio.",
            )}{" "}
            <Link href="/marketplace/commissions" className="cursor-pointer underline hover:text-foreground">
              {t("Manual", "Manual")}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{t("Sale", "Venta")}</p>
            {hasActiveListing ? (
              <span className="text-[11px] text-muted-foreground">{t("Already active", "Ya activa")}</span>
            ) : null}
          </div>
          {hasActiveListing ? null : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{t("Price XLM", "Precio XLM")}</span>
                <input
                  className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                  value={salePriceXlm}
                  onChange={(event) => setSalePriceXlm(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{t("Price USDC", "Precio USDC")}</span>
                <input
                  className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                  value={salePriceUsdc}
                  onChange={(event) => setSalePriceUsdc(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>
              {isCommissionEgg ? (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
                  <span>{t("Estimated delivery (days)", "Entrega estimada (días)")}</span>
                  <input
                    className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                    value={commissionEtaDays}
                    onChange={(event) => setCommissionEtaDays(event.target.value)}
                    placeholder="7"
                    inputMode="numeric"
                  />
                </label>
              ) : null}
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={() => void submitListing()}
                  disabled={Boolean(busy)}
                >
                  {busy === "sale" ? t("Creating...", "Creando...") : t("Create sale", "Crear venta")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{t("Auction", "Subasta")}</p>
            {isCommissionEgg ? (
              <span className="text-[11px] text-muted-foreground">
                {t("Not available for commission eggs", "No disponible para huevos de comisión")}
              </span>
            ) : hasActiveAuction ? (
              <span className="text-[11px] text-muted-foreground">{t("Already active", "Ya activa")}</span>
            ) : null}
          </div>
          {isCommissionEgg || hasActiveAuction ? null : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{t("Start XLM", "Inicio XLM")}</span>
                <input
                  className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                  value={auctionPriceXlm}
                  onChange={(event) => setAuctionPriceXlm(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{t("Start USDC", "Inicio USDC")}</span>
                <input
                  className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                  value={auctionPriceUsdc}
                  onChange={(event) => setAuctionPriceUsdc(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
                <span>{t("Duration (hours)", "Duración (horas)")}</span>
                <input
                  className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                  value={auctionDurationHours}
                  onChange={(event) => setAuctionDurationHours(event.target.value)}
                  placeholder="24"
                  inputMode="numeric"
                />
              </label>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-amber-400 text-black hover:bg-amber-300"
                  onClick={() => void submitAuction()}
                  disabled={Boolean(busy) || hasActiveListing}
                >
                  {busy === "auction"
                    ? t("Creating...", "Creando...")
                    : hasActiveListing
                      ? t("Cancel sale first", "Cancelá la venta primero")
                      : t("Create auction", "Crear subasta")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white/5 p-3">
          <p className="mb-2 text-sm font-medium text-foreground">{t("Swap", "Intercambio")}</p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t(
              "Publish an open swap listing with only an intention. Other users can offer one of their NFTs.",
              "Publicá un intercambio abierto solo con una intención. Otras personas pueden ofrecer uno de sus NFTs.",
            )}
          </p>
          <div className="grid gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>{t("Swap intention", "Intención de intercambio")}</span>
              <textarea
                className="min-h-20 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-foreground"
                value={swapIntention}
                onChange={(event) => setSwapIntention(event.target.value)}
                placeholder={t(
                  "What kind of shimeji are you looking for? Style, traits, rarity, etc.",
                  "¿Qué tipo de shimeji buscás? Estilo, rasgos, rareza, etc.",
                )}
              />
            </label>
            <Button
              type="button"
              size="sm"
              className="w-full bg-sky-400 text-sky-950 hover:bg-sky-300"
              onClick={() => void submitSwapListing()}
              disabled={Boolean(busy) || hasActiveListing || hasActiveAuction}
            >
              {busy === "swap"
                ? t("Creating...", "Creando...")
                : hasActiveListing
                  ? t("Cancel sale first", "Cancelá la venta primero")
                  : hasActiveAuction
                    ? t("End auction first", "Finalizá la subasta primero")
                    : t("Create open swap listing", "Crear intercambio abierto")}
            </Button>
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}
