# Task: Generate OpenClaw pairing code for web user

You must execute this task now and return ONLY the pairing code text.
Do not ask follow-up questions. Do not return explanations.

## Inputs from user
- REQUEST_CODE (one-time code from web config)
- Optional OPENCLAW_AGENT_NAME (default: web-shimeji-1)

## Endpoint
https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue

## Required local values
- OPENCLAW_GATEWAY_TOKEN
  - Recommended source: `openclaw config get gateway.auth.token`
- Optional OPENCLAW_GATEWAY_URL (default: `ws://127.0.0.1:18789`)

## Command
```bash
REQUEST_CODE="PASTE_REQUEST_CODE_HERE"
OPENCLAW_AGENT_NAME="${OPENCLAW_AGENT_NAME:-web-shimeji-1}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(openclaw config get gateway.auth.token)}"

curl -sS -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue \
  -H "Content-Type: application/json" \
  -d "{\"requestCode\":\"$REQUEST_CODE\",\"gatewayUrl\":\"$OPENCLAW_GATEWAY_URL\",\"gatewayToken\":\"$OPENCLAW_GATEWAY_TOKEN\",\"agentName\":\"$OPENCLAW_AGENT_NAME\"}"
```

## Output format (strict)
- Extract `pairingCode` from JSON response.
- Reply with that value only. Example: `Q7M4K9P2`

## Security note
- The request code is one-time and short-lived.
- Never print gateway token or gateway URL in your final reply.
