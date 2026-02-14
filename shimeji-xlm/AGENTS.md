# AGENTS

## Scope

Instructions for working inside `shimeji-xlm/`.

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
- Do not commit secrets.
- Keep diffs focused; avoid unrelated formatting churn.
