# OpenClaw Pairing Code Template

Use this template in your OpenClaw agent/server so it can generate a pairing code and send it to the web user.

## Required
- Website backend env must include `OPENCLAW_PAIRING_ADMIN_TOKEN`.
- You must know your gateway URL and gateway auth token.

## Command
```bash
curl -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings \
  -H "Authorization: Bearer YOUR_OPENCLAW_PAIRING_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gatewayUrl":"wss://your-gateway.example","gatewayToken":"YOUR_GATEWAY_TOKEN","agentName":"web-shimeji-1"}'
```

## Expected response
```json
{
  "pairingCode": "Q7M4K9P2",
  "expiresAt": "2026-02-28T21:30:00.000Z",
  "agentName": "web-shimeji-1",
  "maxClaims": 1
}
```

## What the agent should do
1. Run the command above.
2. Read `pairingCode` from the JSON response.
3. Show that code to the user.
4. Tell the user to open website settings > OpenClaw > Pairing mode and paste the code.
