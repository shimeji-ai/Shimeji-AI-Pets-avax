import {
  Account,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  Address,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { getServer, NETWORK_PASSPHRASE, NFT_CONTRACT_ID } from "./contracts";

async function buildNftTx(
  sourcePublicKey: string,
  methodName: string,
  args: xdr.ScVal[]
): Promise<string> {
  if (!NFT_CONTRACT_ID) {
    throw new Error("NFT contract is not configured");
  }

  const server = getServer();
  const contract = new Contract(NFT_CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const errMsg = (sim as rpc.Api.SimulateTransactionErrorResponse).error ?? "Simulation failed";
    throw new Error(errMsg);
  }

  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

export async function buildTransferNftTx(
  ownerPublicKey: string,
  recipientPublicKey: string,
  tokenId: number
): Promise<string> {
  return buildNftTx(ownerPublicKey, "transfer", [
    new Address(ownerPublicKey).toScVal(),
    new Address(recipientPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
  ]);
}

export async function buildUpdateTokenUriAsCreatorTx(
  creatorPublicKey: string,
  tokenId: number,
  newUri: string
): Promise<string> {
  return buildNftTx(creatorPublicKey, "update_token_uri_as_creator", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
    nativeToScVal(newUri),
  ]);
}

export async function buildFreezeCreatorMetadataUpdatesTx(
  creatorPublicKey: string,
  tokenId: number
): Promise<string> {
  return buildNftTx(creatorPublicKey, "freeze_creator_metadata_updates", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(tokenId, { type: "u64" }),
  ]);
}

/// Permissionless: any creator can mint their own commission egg (self-service).
export async function buildCreateCommissionEggTx(
  creatorPublicKey: string,
  uri: string
): Promise<string> {
  return buildNftTx(creatorPublicKey, "create_commission_egg", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(uri, { type: "string" }),
  ]);
}

/// Permissionless: any creator can mint their own finished NFT.
export async function buildCreateFinishedNftTx(
  creatorPublicKey: string,
  uri: string
): Promise<string> {
  return buildNftTx(creatorPublicKey, "create_finished_nft", [
    new Address(creatorPublicKey).toScVal(),
    nativeToScVal(uri, { type: "string" }),
  ]);
}
