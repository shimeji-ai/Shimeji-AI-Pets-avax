# AGENTS

## Repo Map

| Directory | Description |
|---|---|
| `chrome-extension/` | Browser runtime |
| `desktop/` | Electron runtime |
| `shimeji-eth/` | Ethereum app/contracts |
| `shimeji-xlm/` | Stellar app/contracts (any Stellar wallet supported) |
| `animation-reference/` | Sprite reference for supported animation sets |
| `legacy/` | Local-only archive, ignored by git |

For work inside `shimeji-eth/` or `shimeji-xlm/`, read their local `AGENTS.md` first.

## shimeji-xlm Notes

- `./shimeji-xlm/launch.sh` is the canonical entrypoint (chain + deploy + frontend).
- Core scripts: `scripts/chain.sh`, `scripts/deploy.sh`, `scripts/start.sh`, `scripts/vercel-env-sync.sh`.
- The auction lives on the homepage (no separate `/auction` route).
- Wallet integration uses `@creit.tech/stellar-wallets-kit` with `allowAllModules()` — supports Freighter, Lobstr, and any Stellar-compatible wallet.
- When changing deploy flow, keep docs aligned: `shimeji-xlm/README.md`, `nextjs/README.md`, `soroban/README.md`, `AGENTS.md`.

## Token-Efficient Workflow

1. Use targeted search first.
2. Read only files directly relevant to the task.
3. Avoid broad scans of `node_modules`, build outputs, cached artifacts.
4. Prefer minimal diffs.
5. Validate only the changed scope unless full-repo checks are requested.

## Release-First Push Policy

When pushing changes that include desktop/extension deliverables (`desktop/**`, `chrome-extension/**`):

1. Publish release assets first: `./scripts/publish_release_assets.sh`
2. Required assets: `shimeji-desktop-windows-portable.exe`, `shimeji-desktop-linux.AppImage`, `shimeji-chrome-extension.zip`
3. Never commit desktop binaries to git.
4. If release upload fails, stop and report instead of pushing.

## Guardrails

- Never use destructive git commands unless explicitly requested.
- Preserve unrelated user changes in dirty worktrees.
- Keep docs accurate to the current folder being edited.
