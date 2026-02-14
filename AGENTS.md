# AGENTS

## Scope

Root-level instructions for coding agents working in this monorepo.

## Repo Map

- `chrome-extension/`: browser runtime.
- `desktop/`: Electron runtime.
- `shimeji-eth/`: Ethereum app/contracts.
- `shimeji-xlm/`: Stellar app/contracts.
- `animation-reference/`: sprite reference for currently supported animation sets.
- `legacy/`: local-only archive, ignored by git.

For work inside `shimeji-eth/` or `shimeji-xlm/`, read their local `AGENTS.md` first.

## Token-Efficient Workflow

1. Use targeted search first: `rg <pattern> <path>`.
2. Read only files that are directly relevant to the task.
3. Avoid broad scans of large/generated trees (`node_modules`, build outputs, cached artifacts).
4. Prefer minimal diffs and minimal output in explanations.
5. Validate only the changed scope (targeted lint/test/build), not full-repo checks unless requested.

## Release-First Push Policy (Root)

When the user asks to push to GitHub:

1. Detect whether changes include desktop/extension deliverables:
   - `desktop/**`
   - `chrome-extension/**`
   - `shimeji-eth/packages/nextjs/public/shimeji-chrome-extension.zip`
2. If yes, publish release assets before `git push`:
   - `./scripts/publish_release_assets.sh`
3. Required release assets:
   - `shimeji-desktop-windows-portable.exe`
   - `shimeji-desktop-linux.AppImage`
   - `shimeji-chrome-extension.zip`
4. Keep `/download` and `/downloads` pointing to GitHub Releases `latest` URLs.
5. Never commit desktop binaries (`.exe`, `.AppImage`) to git.
6. If release upload fails, stop and report blocker instead of pushing partial distribution updates.

## Guardrails

- Never use destructive git commands unless explicitly requested.
- Preserve unrelated user changes in dirty worktrees.
- Keep docs and commands accurate to the current folder being edited.
