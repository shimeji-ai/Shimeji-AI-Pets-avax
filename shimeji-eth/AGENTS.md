# AGENTS

## Scope

Instructions for working inside `shimeji-eth/`.

## Token-Efficient Workflow

1. Identify target package first (`packages/foundry` or `packages/nextjs`).
2. Use narrow `rg` queries in that package only.
3. Avoid opening large generated folders unless needed.

Do not scan these by default:

- `node_modules/`
- `.yarn/`
- `packages/nextjs/.next/`
- generated deployment/build artifacts

## Architecture Quick Map

- Contracts: `packages/foundry/contracts/`
- Deploy scripts: `packages/foundry/script/`
- Tests: `packages/foundry/test/`
- Frontend: `packages/nextjs/`

## Personalities & extension zips

- The canonical shared runtime source is `runtime-core/` (especially `runtime-core/personalities`, `runtime-core/characters`, `runtime-core/assets`).
- Run `npm run sync-runtime-core` (legacy alias: `npm run sync-personalities`) or use the root `./build.sh` helper whenever those files change so Chrome/Firefox/desktop mirrors stay aligned before build/release.
- Chrome/Firefox packages live under `dist/` after running `./build.sh chrome`/`firefox`, and the release uploader mirrors them into `shimeji-eth/packages/nextjs/public/shimeji-chrome-extension.zip` and `…/shimeji-firefox-extension.zip`.
- `./scripts/publish_release_assets.sh` runs the sync step automatically before zipping these directories, so invoking it is still the correct release flow when shared runtime assets change.

## Standard Commands

```bash
yarn chain
yarn deploy
yarn start
yarn test
yarn lint
```

Run commands from `shimeji-eth/`.

## Change Rules

- If contract ABI/API changes, update and validate frontend usage.
- Prefer focused tests over full-suite runs unless requested.
- Keep patches small and local to the affected package.
- Do not commit secrets or env files.
