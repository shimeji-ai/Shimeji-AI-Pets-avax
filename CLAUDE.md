# Project Summary

Shimeji Factory opens intergalactic portals that bring animated desktop companions to life. Users connect a Stellar wallet (Freighter), reserve a portal with an intention, and receive a handcrafted shimeji that appears in the Chrome extension.

**Key Principle:** The portal intention guides the art direction and behavior of the shimeji. Access is tied to the user's Freighter wallet.

## Architecture Overview

1. **Web App** (`/web`)
   - Factory UI for portal reservation + intention
   - Freighter wallet connection
   - Email notifications

2. **Chrome Extension** (`/chrome-extension`)
   - Renders shimejis on web pages
   - Syncs unlocks on wallet connect

3. **Desktop App** (`/desktop`)
   - Electron-based desktop app with portable exe
   - Standalone shimeji overlay for Windows
   - See `/desktop/AGENTS.md` for build instructions

## Flow

1. User connects Freighter
2. User reserves a portal and adds an intention
3. Artist crafts sprite set
4. Portal marked complete in backend
5. Extension unlocks the custom shimeji

## Notes

- The wallet connect page is hosted externally (Vercel) and communicates with the extension via `window.postMessage`.
- Sprites can be hosted on IPFS or CDN; the extension should cache them for performance.
