# OpenClaw Agent -> Shimeji Web Pairing (one-time code)

Goal: connect any OpenClaw agent to `https://www.shimeji.dev/` with a secure one-time pairing code.

## User flow (web)

1. Open `https://www.shimeji.dev/`.
2. Open Shimeji settings -> Chat -> Provider -> OpenClaw.
3. Click `Copy agent instructions`.
4. Send those instructions to your agent.
5. Agent returns a one-time `pairingCode`.
6. Paste that code in the web config and click `Pair`.

## Agent flow

The copied instructions already include:
- one-time `requestCode` (short-lived),
- endpoint `/api/site-shimeji/openclaw/pairings/issue`,
- command to send `gatewayUrl` + `gatewayToken` + `agentName`,
- hosted URL auto-read from `openclaw config get gateway.url` when available,
- localhost/private gateway autodetection with automatic tunnel fallback:
  `ssh` + `localhost.run` first, then `cloudflared`.
- explicit HTTP status capture to avoid false "server down" assumptions.

The agent should return only the pairing code.

## Security model

- `requestCode` is short-lived and consumed once.
- `pairingCode` is short-lived and consumed once.
- Browser stores only a temporary relay session token after claim.
- The web shimeji has no local terminal/WSL access.
