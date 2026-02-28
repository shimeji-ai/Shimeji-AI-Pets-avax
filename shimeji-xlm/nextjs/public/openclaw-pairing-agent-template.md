# Task: Generate OpenClaw pairing code for web user

You must execute this task now and return ONLY the pairing code text.
Do not ask follow-up questions. Do not return explanations.

## Required inputs
- OPENCLAW_PAIRING_ADMIN_TOKEN
- OPENCLAW_GATEWAY_URL
- OPENCLAW_GATEWAY_TOKEN
- OPENCLAW_AGENT_NAME (optional, default: web-shimeji-1)

## Endpoint
https://YOUR_SITE/api/site-shimeji/openclaw/pairings

## Command
```bash
curl -sS -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings \
  -H "Authorization: Bearer $OPENCLAW_PAIRING_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gatewayUrl\":\"$OPENCLAW_GATEWAY_URL\",\"gatewayToken\":\"$OPENCLAW_GATEWAY_TOKEN\",\"agentName\":\"${OPENCLAW_AGENT_NAME:-web-shimeji-1}\"}"
```

## Output format (strict)
- Extract `pairingCode` from JSON response.
- Reply with that value only. Example: `Q7M4K9P2`
