# OpenClaw Agent -> Shimeji Web (shimeji.dev) Quick Instructions

Goal: connect your OpenClaw gateway to the Shimeji web mascot on `https://www.shimeji.dev/` and send a test message to verify the connection.

Important:
- Do NOT clone this repo.
- Do NOT run `npm run start` for this task.
- `shimeji.dev` is already online.
- You only need a running OpenClaw gateway, its URL, and a valid gateway auth token.

## What you need

- `Gateway URL` (`ws://...` or `wss://...`)
- `Gateway auth token`
- `Agent name` (session/agent identifier; default can be `web-shimeji-1`)

## If local `ws://127.0.0.1:18789` does not work from shimeji.dev

Because `shimeji.dev` runs over HTTPS, browsers may block direct local `ws://` connections (mixed content or network restrictions).

Use a public `wss://` URL instead (free option: Cloudflare Tunnel).

Example (free):

```bash
cloudflared tunnel --url http://127.0.0.1:18789
```

Then copy the `https://...trycloudflare.com` URL shown by `cloudflared` and use it as `Gateway URL` in shimeji.dev.
The site can convert `https://...` to `wss://...` automatically.

## Steps (for an agent or operator)

1. Open `https://www.shimeji.dev/`.
2. In the right-side config panel on the landing hero, open the `Provider` tab.
3. Select `OpenClaw`.
4. (Optional but recommended) Click `I'm an agent` to view extra integration notes.
5. Fill:
   - `Gateway URL`
   - `Agent name`
   - `Gateway auth token`
6. Click the Shimeji mascot to open chat.
7. Send a test message.

## Suggested test message

Use something simple and explicit, for example:

```text
Hola Lulox, estoy conectado a traves de la mascota web de shimeji.dev. Esta es una prueba de conexion por OpenClaw.
```

## Verify success

Connection is working if:
- the web Shimeji chat returns a response from your agent, and
- the reply appears inside the Shimeji chat bubble on `shimeji.dev`.

## Troubleshooting

- If connection fails with local URL:
  - use a tunnel and a public `wss://` URL (Cloudflare Tunnel is free).
- If auth fails:
  - verify the gateway token.
- If the wrong agent responds:
  - change `Agent name` to the expected session/agent identifier.

