# Task: Generate OpenClaw pairing code for web user

You must execute this task now and return ONLY the pairing code text.
Do not ask follow-up questions. Do not return explanations.

## Required inputs
- OPENCLAW_PAIRING_ISSUER_TOKEN
- OPENCLAW_AGENT_NAME (optional, default: web-shimeji-1)

## Endpoint
https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue

## Command
```bash
curl -sS -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue \
  -H "Authorization: Bearer $OPENCLAW_PAIRING_ISSUER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"${OPENCLAW_AGENT_NAME:-web-shimeji-1}\"}"
```

## Output format (strict)
- Extract `pairingCode` from JSON response.
- Reply with that value only. Example: `Q7M4K9P2`

## Security note
- This flow does NOT expose gateway credentials to the agent prompt.
- Gateway URL/token remain only on the website backend env.
