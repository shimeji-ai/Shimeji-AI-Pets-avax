# Animation Reference

This folder documents the sprite sets currently relevant for this project.

## 1) Simple Walk Character

Use this minimal set when you want a basic character that only idles and walks:

- `stand-neutral.png`
- `walk-step-left.png`
- `walk-step-right.png`

Recommended walk loop:

- `walk-step-left -> stand-neutral -> walk-step-right -> stand-neutral`

Notes:

- Keep all frames the same canvas size (recommended `128x128`, transparent background).
- Align feet to the same baseline in all frames to avoid jitter.

## 2) Full Runtime Set (Current App)

This is the set currently used by both:

- `chrome-extension/`
- `desktop/`

Source of truth in this repo: `animation-reference/runtime-required/`

Required files:

- `bounce-recover.png`
- `bounce-squish.png`
- `climb-ceiling-frame-1.png`
- `climb-ceiling-frame-2.png`
- `climb-wall-frame-1.png`
- `climb-wall-frame-2.png`
- `crawl-crouch.png`
- `dragged-tilt-left-heavy.png`
- `dragged-tilt-left-light.png`
- `dragged-tilt-right-heavy.png`
- `dragged-tilt-right-light.png`
- `fall.png`
- `grab-ceiling.png`
- `grab-wall.png`
- `jump.png`
- `resist-frame-1.png`
- `resist-frame-2.png`
- `sit-edge-dangle-frame-1.png`
- `sit-edge-dangle-frame-2.png`
- `sit-edge-legs-down.png`
- `sit-edge-legs-up.png`
- `sit-look-up.png`
- `sit.png`
- `spin-head-frame-1.png`
- `spin-head-frame-2.png`
- `spin-head-frame-3.png`
- `spin-head-frame-4.png`
- `spin-head-frame-5.png`
- `spin-head-frame-6.png`
- `sprawl-lying.png`
- `stand-neutral.png`
- `walk-step-left.png`
- `walk-step-right.png`

## Not In Use (Yet)

For the current Chrome extension and desktop app, ignore these folders:

- `animation-reference/all-sprites/`
- `animation-reference/complete/`
- `animation-reference/mvp/`

They are archival/experimental references and are not the runtime-required set today.
