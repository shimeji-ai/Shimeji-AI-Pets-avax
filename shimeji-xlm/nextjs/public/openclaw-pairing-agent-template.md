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
- OPENCLAW_GATEWAY_URL
  - Hosted/online OpenClaw: set a public `wss://...` URL (or let command read `openclaw config get gateway.url`)
  - Local OpenClaw fallback default: `ws://127.0.0.1:18789`
  - If local/private, the command auto-creates a public tunnel URL
  - Tunnel priority: `ssh` + `localhost.run` first, then Cloudflare (`cloudflared`)

## Command
```bash
REQUEST_CODE="PASTE_REQUEST_CODE_HERE"
OPENCLAW_AGENT_NAME="${OPENCLAW_AGENT_NAME:-web-shimeji-1}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-$(openclaw config get gateway.url 2>/dev/null || true)}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-ws://127.0.0.1:18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(openclaw config get gateway.auth.token)}"
OPENCLAW_TUNNEL_DIR="${OPENCLAW_TUNNEL_DIR:-/tmp/openclaw-pairing}"

extract_host() {
  echo "$1" | sed -E 's#^[a-zA-Z]+://([^/:]+).*#\1#'
}

extract_path() {
  local value="$1"
  local without_scheme="${value#*://}"
  local path_part="${without_scheme#*/}"
  if [[ "$without_scheme" == "$path_part" ]]; then
    echo "/"
  else
    echo "/$path_part"
  fi
}

is_private_host() {
  local host="${1,,}"
  [[ -z "$host" ]] && return 0
  [[ "$host" == "localhost" || "$host" == "host.docker.internal" || "$host" == *.local ]] && return 0
  [[ "$host" == "::1" || "$host" == fe80:* || "$host" == fc* || "$host" == fd* ]] && return 0
  [[ "$host" =~ ^127\. ]] && return 0
  [[ "$host" =~ ^10\. ]] && return 0
  [[ "$host" =~ ^169\.254\. ]] && return 0
  [[ "$host" =~ ^192\.168\. ]] && return 0
  [[ "$host" =~ ^172\.(1[6-9]|2[0-9]|3[0-1])\. ]] && return 0
  return 1
}

GATEWAY_HOST="$(extract_host "$OPENCLAW_GATEWAY_URL")"
if is_private_host "$GATEWAY_HOST"; then
  mkdir -p "$OPENCLAW_TUNNEL_DIR"
  LOCAL_HOSTPORT="$(echo "$OPENCLAW_GATEWAY_URL" | sed -E 's#^[a-zA-Z]+://([^/]+).*$#\1#')"
  LOCAL_PATH="$(extract_path "$OPENCLAW_GATEWAY_URL")"
  [[ "$LOCAL_HOSTPORT" == *:* ]] || LOCAL_HOSTPORT="$LOCAL_HOSTPORT:80"
  LOCAL_TUNNEL_TARGET="${OPENCLAW_LOCAL_TUNNEL_TARGET:-http://$LOCAL_HOSTPORT}"
  PUBLIC_URL=""

  if command -v ssh >/dev/null 2>&1; then
    TUNNEL_LOG="$OPENCLAW_TUNNEL_DIR/localhost-run.log"
    TUNNEL_PID_FILE="$OPENCLAW_TUNNEL_DIR/localhost-run.pid"
    if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
      :
    else
      nohup ssh -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:"$LOCAL_HOSTPORT" nokey@localhost.run >"$TUNNEL_LOG" 2>&1 &
      echo $! > "$TUNNEL_PID_FILE"
    fi

    for _ in $(seq 1 30); do
      PUBLIC_URL="$(grep -Eo 'https://[A-Za-z0-9.-]+\.localhost\.run' "$TUNNEL_LOG" | tail -n 1 || true)"
      [[ -n "$PUBLIC_URL" ]] && break
      sleep 1
    done
  elif command -v cloudflared >/dev/null 2>&1; then
    TUNNEL_LOG="$OPENCLAW_TUNNEL_DIR/cloudflared.log"
    TUNNEL_PID_FILE="$OPENCLAW_TUNNEL_DIR/cloudflared.pid"
    if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
      :
    else
      nohup cloudflared tunnel --url "$LOCAL_TUNNEL_TARGET" >"$TUNNEL_LOG" 2>&1 &
      echo $! > "$TUNNEL_PID_FILE"
    fi

    for _ in $(seq 1 20); do
      PUBLIC_URL="$(grep -Eo 'https://[A-Za-z0-9.-]+trycloudflare.com' "$TUNNEL_LOG" | tail -n 1 || true)"
      [[ -n "$PUBLIC_URL" ]] && break
      sleep 1
    done
  else
    echo "Local gateway detected but neither cloudflared nor ssh is available." >&2
    exit 1
  fi

  if [[ -z "$PUBLIC_URL" ]]; then
    echo "Could not create public tunnel URL from cloudflared/localhost.run." >&2
    exit 1
  fi
  if [[ "$LOCAL_PATH" == "/" ]]; then
    OPENCLAW_GATEWAY_URL="$PUBLIC_URL"
  else
    OPENCLAW_GATEWAY_URL="${PUBLIC_URL%/}$LOCAL_PATH"
  fi
fi

PAYLOAD="$(printf '{"requestCode":"%s","gatewayUrl":"%s","gatewayToken":"%s","agentName":"%s"}' "$REQUEST_CODE" "$OPENCLAW_GATEWAY_URL" "$OPENCLAW_GATEWAY_TOKEN" "$OPENCLAW_AGENT_NAME")"
RESPONSE="$(
  curl -sS --connect-timeout 8 --max-time 25 --retry 1 --retry-delay 1 \
    -w '\nHTTP_STATUS:%{http_code}\n' \
    -X POST https://YOUR_SITE/api/site-shimeji/openclaw/pairings/issue \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
)"
BODY="$(printf '%s' "$RESPONSE" | sed '/^HTTP_STATUS:/d')"
STATUS="$(printf '%s' "$RESPONSE" | sed -n 's/^HTTP_STATUS://p' | tail -n 1)"

if [[ "$STATUS" != "200" ]]; then
  echo "pairing issue failed (status=$STATUS): $BODY" >&2
  exit 1
fi

echo "$BODY"
```

## Output format (strict)
- Extract `pairingCode` from JSON response.
- Reply with that value only. Example: `Q7M4K9P2`

## Security note
- `requestCode` is one-time and short-lived.
- `pairingCode` is one-time and short-lived.
- Never print gateway token or gateway URL in your final reply.
