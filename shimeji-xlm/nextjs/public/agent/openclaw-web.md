# OpenClaw -> Shimeji Web Pairing

Goal: connect any OpenClaw agent to `https://www.shimeji.dev/` using a one-time pairing code.

## User flow
1. Open `https://www.shimeji.dev/`.
2. Settings -> Chat -> Provider -> OpenClaw.
3. Click `Copy agent instructions`.
4. Send the copied text to your agent.
5. Agent returns `pairingCode`.
6. Paste it and click `Pair`.

## Important
- Pairing requires a **public** OpenClaw gateway URL (`wss://...` / `https://...`).
- `localhost`/private URLs are not accepted by web pairing.
- Local OpenClaw must expose a public tunnel URL first.

## Security model
- `requestCode`: one-time + short-lived.
- `pairingCode`: one-time + short-lived.
- Browser stores only a temporary session token.
- Website uses only a remote relay session for chat.
