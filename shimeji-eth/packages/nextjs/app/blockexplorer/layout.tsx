import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Local Block Explorer",
  description:
    "Inspect local Ethereum blocks and transactions for Shimeji AI Pets development.",
  imageRelativePath: "/bunny-hero.png",
});

const BlockExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default BlockExplorerLayout;
