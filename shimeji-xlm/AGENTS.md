# AGENTS

## Scope

Instructions for working inside `shimeji-xlm/`.

## Personalities sync reminder

- The canonical shared runtime source is `runtime-core/` (including `runtime-core/personalities`, `runtime-core/characters`, `runtime-core/assets`).
- Run `npm run sync-runtime-core` (legacy alias: `npm run sync-personalities`) or use the root `./build.sh` helper to copy core data into the desktop/chrome/firefox runtime folders before packaging.
- The Chrome/Firefox zips live under `dist/` after running `./build.sh chrome|firefox`, and the release uploader copies them into `shimeji-eth/packages/nextjs/public`. If you edit runtime-core, re-run sync before invoking those builds.

## Framework (Current)

- Use `./launch.sh` as the primary onboarding and operations entrypoint.
- Treat these scripts as the canonical flow:
  - `scripts/chain.sh` for local chain lifecycle.
  - `scripts/deploy.sh` for local/testnet/mainnet contract deployment.
  - `scripts/start.sh` for frontend local dev.
  - `scripts/vercel-env-sync.sh` for syncing deployment env vars to Vercel.
- Deploy flow includes guided on-chain verification:
  - embeds `source_repo` metadata in WASM builds when configured.
  - performs post-deploy hash/build-info verification.
  - may prompt for `STELLAR_RPC_HEADERS` API key if RPC provider requires it.
- Deploy flow auto-creates an initial auction by default; minimum can be defined in USDC or XLM via env (`AUTO_CREATE_INITIAL_AUCTION`, `INITIAL_AUCTION_MIN_*`).
- Keep `README.md`, `nextjs/README.md`, and `soroban/README.md` consistent with script behavior whenever onboarding/deploy flows change.

## Token-Efficient Workflow

1. Decide lane first:
   - frontend: `nextjs/`
   - contracts: `soroban/`
2. Use targeted search in that lane only.
3. Avoid broad scans of generated output (`target/`, build artifacts, caches).

## Commands

Frontend:

```bash
cd shimeji-xlm/nextjs
pnpm dev
pnpm lint
pnpm build
```

Contracts:

```bash
cd shimeji-xlm/soroban
stellar contract build
cargo test
```

## Change Rules

- If contract interfaces/IDs change, update frontend env/config references in the same task.
- Keep network-specific values configurable via env.
- Keep source verification settings configurable in `shimeji-xlm/.env` (`CONTRACT_SOURCE_REPO`, `ENABLE_ONCHAIN_SOURCE_VERIFICATION`, `STELLAR_RPC_HEADERS`).
- Do not commit secrets.
- Keep diffs focused; avoid unrelated formatting churn.
