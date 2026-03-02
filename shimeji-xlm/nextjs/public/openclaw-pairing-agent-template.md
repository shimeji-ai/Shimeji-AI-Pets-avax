# Task: Generate OpenClaw pairing code for web user

Return ONLY the pairing code (example: `Q7M4K9P2`).
Do not ask questions. Do not add explanations.

## Input from user
- `REQUEST_CODE` (one-time code shown in web config)
- Optional `OPENCLAW_AGENT_NAME` (default: `web-shimeji-1`)

## Required local values
- `OPENCLAW_GATEWAY_URL`:
  - Must be a **public** internet URL (`wss://...` or `https://...`)
  - `localhost`/private URLs are rejected
  - If running locally, create a tunnel first and use that public URL
- `OPENCLAW_GATEWAY_TOKEN`:
  - Recommended source: `openclaw config get gateway.auth.token`

## Endpoint
`https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue`

## Command
```bash
set -euo pipefail

REQUEST_CODE="PASTE_REQUEST_CODE_HERE"
OPENCLAW_AGENT_NAME="${OPENCLAW_AGENT_NAME:-web-shimeji-1}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-$(openclaw config get gateway.url 2>/dev/null || true)}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(openclaw config get gateway.auth.token 2>/dev/null || true)}"

[[ -n "$OPENCLAW_GATEWAY_URL" ]] || { echo "Missing OPENCLAW_GATEWAY_URL" >&2; exit 1; }
[[ -n "$OPENCLAW_GATEWAY_TOKEN" ]] || { echo "Missing OPENCLAW_GATEWAY_TOKEN" >&2; exit 1; }

[[ "$OPENCLAW_GATEWAY_URL" == http://* ]] && OPENCLAW_GATEWAY_URL="ws://${OPENCLAW_GATEWAY_URL#http://}"
[[ "$OPENCLAW_GATEWAY_URL" == https://* ]] && OPENCLAW_GATEWAY_URL="wss://${OPENCLAW_GATEWAY_URL#https://}"

HOST="$(echo "$OPENCLAW_GATEWAY_URL" | sed -E 's#^[a-zA-Z]+://([^/:]+).*#\1#')"
[[ -n "$HOST" ]] || { echo "Invalid OPENCLAW_GATEWAY_URL" >&2; exit 1; }
[[ "$HOST" != "localhost" && "$HOST" != "host.docker.internal" && "$HOST" != *.local ]] || {
  echo "Gateway URL must be public (not localhost/private)" >&2; exit 1;
}

PAYLOAD="$(printf '{"requestCode":"%s","gatewayUrl":"%s","gatewayToken":"%s","agentName":"%s"}' "$REQUEST_CODE" "$OPENCLAW_GATEWAY_URL" "$OPENCLAW_GATEWAY_TOKEN" "$OPENCLAW_AGENT_NAME")"
RESPONSE="$({ curl -sS --connect-timeout 8 --max-time 35 -w '\nHTTP_STATUS:%{http_code}\n' \
  -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD"; } || true)"

BODY="$(printf '%s' "$RESPONSE" | sed '/^HTTP_STATUS:/d')"
STATUS="$(printf '%s' "$RESPONSE" | sed -n 's/^HTTP_STATUS://p' | tail -n 1)"
[[ "$STATUS" == "200" ]] || { echo "pairing issue failed (status=${STATUS:-000}): $BODY" >&2; exit 1; }

echo "$BODY" | sed -n 's/.*"pairingCode"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p'
```

## Security
- `requestCode` is one-time, short-lived.
- `pairingCode` is one-time, short-lived.
- Never print token/URL in final reply.
