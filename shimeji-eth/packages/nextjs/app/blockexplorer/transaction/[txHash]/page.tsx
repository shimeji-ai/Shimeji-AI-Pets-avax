import TransactionComp from "../_components/TransactionComp";
import type { Metadata, NextPage } from "next";
import { Hash } from "viem";
import { isZeroAddress } from "~~/utils/scaffold-eth/common";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

type PageProps = {
  params: Promise<{ txHash?: Hash }>;
};

export function generateStaticParams() {
  // An workaround to enable static exports in Next.js, generating single dummy page.
  return [{ txHash: "0x0000000000000000000000000000000000000000" }];
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const txHash = params?.txHash;
  const shortHash = txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : "Transaction";

  return getMetadata({
    title: `Transaction ${shortHash}`,
    description: "Inspect transaction details in the local Shimeji AI Pets block explorer.",
    imageRelativePath: "/bunny-hero.png",
  });
}

const TransactionPage: NextPage<PageProps> = async (props: PageProps) => {
  const params = await props.params;
  const txHash = params?.txHash as Hash;

  if (isZeroAddress(txHash)) return null;

  return <TransactionComp txHash={txHash} />;
};

export default TransactionPage;
