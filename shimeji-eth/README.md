# shimeji-eth

Ethereum implementation for Shimeji products.

This workspace is based on Scaffold-ETH and contains:

- `packages/foundry/`: smart contracts, scripts, tests.
- `packages/nextjs/`: frontend dApp.

## Prerequisites

- Node.js `>= 20.18.3`
- Yarn `3.x`

## Install

```bash
cd shimeji-eth
yarn install
```

## Local Development

Use 3 separate terminals:

Terminal 1 (frontend app):

```bash
yarn start
```

Terminal 2 (local blockchain for development):

```bash
yarn chain
```

Terminal 3 (deploy contracts):

```bash
yarn deploy
```

## Common Commands

```bash
yarn test
yarn lint
yarn format
yarn compile
yarn verify --network <network>
```

## Notes

- Contract deployment artifacts feed frontend contract config.
- Frontend and contracts should be validated together when contract interfaces change.
