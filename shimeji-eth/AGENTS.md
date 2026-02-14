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
