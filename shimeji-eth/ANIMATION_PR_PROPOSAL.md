# Animation PR Proposal: `shimeji-eth` Next.js Mascot

## Goal
Bring `shimeji-eth/packages/nextjs/components/site-shimeji-mascot.tsx` to full animation-frame parity with the reference set, starting with `runtime-required` (current runtime truth), then optionally adding advanced `all-sprites` behaviors.

## Sources Reviewed
- `animation-reference/README.md`
- `animation-reference/SPRITE-REFERENCE.md`
- `animation-reference/SPRITE-REFERENCE-ART.md`
- `animation-reference/runtime-required/README.md`
- `shimeji-eth/packages/nextjs/components/site-shimeji-mascot.tsx`

## 1) Full Sprite Inventory

### `animation-reference/all-sprites/` (46 total)
`bounce-recover.png`, `bounce-squish.png`, `carry-window-stand.png`, `carry-window-walk-frame-1.png`, `carry-window-walk-frame-2.png`, `climb-ceiling-frame-1.png`, `climb-ceiling-frame-2.png`, `climb-wall-frame-1.png`, `climb-wall-frame-2.png`, `crawl-crouch.png`, `divide-frame-1.png`, `divide-frame-2.png`, `divide-frame-3.png`, `divide-frame-4.png`, `divide-frame-5.png`, `dragged-tilt-left-heavy.png`, `dragged-tilt-left-light.png`, `dragged-tilt-right-heavy.png`, `dragged-tilt-right-light.png`, `fall.png`, `grab-ceiling.png`, `grab-wall.png`, `jump.png`, `pull-up-friend-frame-1.png`, `pull-up-friend-frame-2.png`, `pull-up-friend-frame-3.png`, `pull-up-friend-frame-4.png`, `resist-frame-1.png`, `resist-frame-2.png`, `sit-edge-dangle-frame-1.png`, `sit-edge-dangle-frame-2.png`, `sit-edge-legs-down.png`, `sit-edge-legs-up.png`, `sit-look-up.png`, `sit.png`, `spin-head-frame-1.png`, `spin-head-frame-2.png`, `spin-head-frame-3.png`, `spin-head-frame-4.png`, `spin-head-frame-5.png`, `spin-head-frame-6.png`, `sprawl-lying.png`, `stand-neutral.png`, `throw-window.png`, `walk-step-left.png`, `walk-step-right.png`

### `animation-reference/runtime-required/` (33 total)
`bounce-recover.png`, `bounce-squish.png`, `climb-ceiling-frame-1.png`, `climb-ceiling-frame-2.png`, `climb-wall-frame-1.png`, `climb-wall-frame-2.png`, `crawl-crouch.png`, `dragged-tilt-left-heavy.png`, `dragged-tilt-left-light.png`, `dragged-tilt-right-heavy.png`, `dragged-tilt-right-light.png`, `fall.png`, `grab-ceiling.png`, `grab-wall.png`, `jump.png`, `resist-frame-1.png`, `resist-frame-2.png`, `sit-edge-dangle-frame-1.png`, `sit-edge-dangle-frame-2.png`, `sit-edge-legs-down.png`, `sit-edge-legs-up.png`, `sit-look-up.png`, `sit.png`, `spin-head-frame-1.png`, `spin-head-frame-2.png`, `spin-head-frame-3.png`, `spin-head-frame-4.png`, `spin-head-frame-5.png`, `spin-head-frame-6.png`, `sprawl-lying.png`, `stand-neutral.png`, `walk-step-left.png`, `walk-step-right.png`

### `all-sprites` entries not in `runtime-required/` (13 advanced-only)
`carry-window-stand.png`, `carry-window-walk-frame-1.png`, `carry-window-walk-frame-2.png`, `divide-frame-1.png`, `divide-frame-2.png`, `divide-frame-3.png`, `divide-frame-4.png`, `divide-frame-5.png`, `pull-up-friend-frame-1.png`, `pull-up-friend-frame-2.png`, `pull-up-friend-frame-3.png`, `pull-up-friend-frame-4.png`, `throw-window.png`

## 2) What Is Implemented in the Web Mascot Today

### Current implementation in `site-shimeji-mascot.tsx`
- State machine exists for movement: `falling`, `floor-walking`, `wall-climbing`, `ceiling-walking` (`site-shimeji-mascot.tsx:9`).
- Only sprite map configured:
  - `stand: /shimeji-original/stand-neutral.png`
  - `walk: [/shimeji-original/walk-step-left.png, /shimeji-original/walk-step-right.png]`
  (`site-shimeji-mascot.tsx:92-98`)
- Sprite selection logic:
  - Uses `stand` while falling, dragging, or chat open (`site-shimeji-mascot.tsx:301-304`).
  - Uses only walk frames for every non-falling movement state (`site-shimeji-mascot.tsx:305-309`).
- Wall/ceiling behavior is currently simulated by rotating the same walk frames (`site-shimeji-mascot.tsx:238-245`, `site-shimeji-mascot.tsx:249-253`, `site-shimeji-mascot.tsx:261`, `site-shimeji-mascot.tsx:273`).

### Current assets in Next.js public folder
`shimeji-eth/packages/nextjs/public/shimeji-original/` currently contains only 3 files:
- `stand-neutral.png`
- `walk-step-left.png`
- `walk-step-right.png`

Coverage:
- Runtime-required: `3/33` implemented, `30` missing.
- All-sprites: `3/46` implemented, `43` missing.

## 3) Available Animations, Status, and Priority

| Animation Family | Description | Reference Frames | Status in Web | Priority |
|---|---|---|---|---|
| Standing + Walking | Neutral idle and step cycle | `stand-neutral`, `walk-step-left`, `walk-step-right` | Implemented | Already done |
| Falling + Landing | Airborne fall and impact recovery | `fall`, `bounce-squish`, `bounce-recover` | Missing | High |
| Jump | Upward leap pose before falling | `jump` | Missing | High |
| Drag Tilt | Visual response while dragged by pointer | `dragged-tilt-left/right-light/heavy` | Missing | High |
| Resist | Struggle loop while dragged | `resist-frame-1`, `resist-frame-2` | Missing | High |
| Wall Climb | Wall hold and climb alternation | `grab-wall`, `climb-wall-frame-1`, `climb-wall-frame-2` | Missing (motion exists, correct frames missing) | High |
| Ceiling Crawl | Ceiling hold and crawl alternation | `grab-ceiling`, `climb-ceiling-frame-1`, `climb-ceiling-frame-2` | Missing (motion exists, correct frames missing) | High |
| Sit + Rest | Seated/crouch/lying idle variations | `sit`, `sit-look-up`, `sprawl-lying`, `crawl-crouch` | Missing | Medium |
| Edge Sit | Perched ledge animation | `sit-edge-legs-up`, `sit-edge-legs-down`, `sit-edge-dangle-frame-1/2` | Missing | Medium |
| Head Spin | Playful seated spin sequence | `spin-head-frame-1..6` (usually entering from `sit-look-up`) | Missing | Medium |
| Pull-up Friend | Spawn/clone animation stage A | `pull-up-friend-frame-1..4` | Missing | Low |
| Divide | Spawn/clone animation stage B | `divide-frame-1..5` | Missing | Low |
| Window Handling | Carry/throw window actions | `carry-window-stand`, `carry-window-walk-frame-1/2`, `throw-window` | Missing | Low |

## 4) Exact Missing Frame Lists

### Missing from Next.js vs `runtime-required/` (30)
`bounce-recover.png`, `bounce-squish.png`, `climb-ceiling-frame-1.png`, `climb-ceiling-frame-2.png`, `climb-wall-frame-1.png`, `climb-wall-frame-2.png`, `crawl-crouch.png`, `dragged-tilt-left-heavy.png`, `dragged-tilt-left-light.png`, `dragged-tilt-right-heavy.png`, `dragged-tilt-right-light.png`, `fall.png`, `grab-ceiling.png`, `grab-wall.png`, `jump.png`, `resist-frame-1.png`, `resist-frame-2.png`, `sit-edge-dangle-frame-1.png`, `sit-edge-dangle-frame-2.png`, `sit-edge-legs-down.png`, `sit-edge-legs-up.png`, `sit-look-up.png`, `sit.png`, `spin-head-frame-1.png`, `spin-head-frame-2.png`, `spin-head-frame-3.png`, `spin-head-frame-4.png`, `spin-head-frame-5.png`, `spin-head-frame-6.png`, `sprawl-lying.png`

### Additional missing from Next.js vs full `all-sprites/` (13)
`carry-window-stand.png`, `carry-window-walk-frame-1.png`, `carry-window-walk-frame-2.png`, `divide-frame-1.png`, `divide-frame-2.png`, `divide-frame-3.png`, `divide-frame-4.png`, `divide-frame-5.png`, `pull-up-friend-frame-1.png`, `pull-up-friend-frame-2.png`, `pull-up-friend-frame-3.png`, `pull-up-friend-frame-4.png`, `throw-window.png`

## 5) Suggested Implementation Approach (Per Missing Animation Family)

### A. High Priority: Runtime-required behavioral parity

#### 1. Falling + Landing (`fall`, `bounce-*`)
- Trigger: any transition into airborne motion.
- Sequence:
  - Falling loop: `fall`
  - On floor contact: `bounce-squish -> bounce-recover -> stand-neutral`
- Implementation notes:
  - Keep physics as-is; only replace sprite selection logic in `tick`.
  - Add one-shot animation queue support for landing sequence.

#### 2. Jump (`jump`)
- Trigger: periodic random jump while floor-walking or as transition out of idle.
- Sequence: `jump -> fall -> landing bounce`.
- Implementation notes:
  - Add `jumping` state with initial negative `vy` and short `jump` frame hold.

#### 3. Drag Tilt + Resist (`dragged-*`, `resist-*`)
- Trigger: `isDragging === true`.
- Sequence:
  - Pointer delta decides tilt frame (light/heavy left/right).
  - Every N ms (or when dragged long enough), alternate `resist-frame-1/2` burst.
- Implementation notes:
  - Use horizontal delta thresholds from reference docs (light vs heavy).
  - Keep drag position math unchanged.

#### 4. Wall Climb (`grab-wall`, `climb-wall-*`)
- Trigger: existing `wall-climbing` state.
- Sequence: `grab-wall` at enter, then alternate `climb-wall-frame-1/2` while moving.
- Implementation notes:
  - Replace walk+rotation visuals with dedicated wall frames.
  - Flip horizontally for wall side/direction as needed.

#### 5. Ceiling Crawl (`grab-ceiling`, `climb-ceiling-*`)
- Trigger: existing `ceiling-walking` state.
- Sequence: `grab-ceiling` at enter, then alternate `climb-ceiling-frame-1/2` while moving.
- Implementation notes:
  - Replace walk+180deg rotation with dedicated ceiling frames.
  - Keep horizontal travel logic already present.

### B. Medium Priority: Expressive idle set

#### 6. Sit + Rest (`sit`, `sit-look-up`, `sprawl-lying`, `crawl-crouch`)
- Trigger: idle timer while not dragged and not in boundary transitions.
- Sequence:
  - Base rest: `sit`
  - If pointer above mascot: `sit-look-up`
  - Occasional long-idle variants: `sprawl-lying`, `crawl-crouch`
- Implementation notes:
  - Add idle dwell timer and weighted random picker.

#### 7. Edge Sit (`sit-edge-*`)
- Trigger: paused near viewport edge after floor-walking or at a deterministic idle checkpoint.
- Sequence (from docs): `sit-edge-legs-up -> sit-edge-legs-down -> sit-edge-dangle-frame-1 -> sit-edge-legs-down -> sit-edge-dangle-frame-2` (loop while perched).
- Implementation notes:
  - Add temporary edge anchor mode with movement paused.

#### 8. Head Spin (`spin-head-frame-1..6`)
- Trigger: occasional playful idle after sit/look-up.
- Sequence (from docs): `sit-look-up -> spin-1 -> spin-4 -> spin-2 -> spin-5 -> spin-3 -> spin-6 -> sit`.
- Implementation notes:
  - Define as one-shot animation sequence with low trigger probability.

### C. Low Priority: Advanced all-sprites-only features

#### 9. Pull-up Friend (`pull-up-friend-frame-1..4`)
- Trigger: special event to spawn second mascot.
- Sequence: play pull-up sequence, instantiate second mascot actor.
- Implementation notes:
  - Requires transitioning from single-instance actor to array/list of mascot actors.

#### 10. Divide (`divide-frame-1..5`)
- Trigger: special event after idle timer or user command.
- Sequence: full divide frames then duplicate actor.
- Implementation notes:
  - Same multi-actor architecture requirement as pull-up.

#### 11. Window Handling (`carry-window-*`, `throw-window`)
- Trigger: optional novelty mode only.
- Sequence: carry stand/walk then throw action.
- Implementation notes:
  - Browser tab cannot manipulate native windows; repurpose to drag/throw an in-page DOM prop if implemented.

## 6) Proposed PR Breakdown

### PR 1 (High) - Runtime-required parity
- Add missing 30 runtime-required PNGs to `packages/nextjs/public/shimeji-original/`.
- Refactor mascot animation selection to use a declarative animation table.
- Implement missing high-priority state visuals (fall/landing/jump/drag/resist/wall/ceiling).

### PR 2 (Medium) - Expressive idle behaviors
- Implement sit/rest, edge-sit, and head-spin behavior scheduling.
- Tune timing randomness to avoid repetitive loops.

### PR 3 (Low) - Advanced all-sprites features
- Implement multi-mascot architecture for pull-up/divide.
- Decide whether to repurpose or skip window-handling frames in web runtime.

## 7) Recommended Technical Structure

1. Create sprite manifest constant (`SPRITES`) with strict keys.
2. Create animation definitions (`ANIMATIONS`) with frame durations.
3. Add animation controller fields in `physicsRef`:
   - `animKey`, `animFrameIdx`, `animFrameStartedAt`, `queuedAnim`.
4. Keep motion/physics state separate from render animation state.
5. Use CSS horizontal flip (`scaleX(-1)`) for direction instead of rotating walk frames for all contexts.

## 8) Acceptance Criteria
- `packages/nextjs/public/shimeji-original/` contains full runtime-required set (33/33).
- `site-shimeji-mascot.tsx` no longer shows `stand-neutral` during falling/dragging/wall/ceiling states.
- Every runtime-required animation family is observable in-browser.
- No missing asset 404s in devtools network panel.
- Movement remains smooth (no visible frame jitter from mismatched anchor/baseline).

## 9) Risk Notes
- Sprite baseline mismatch can cause jitter; keep original canvas dimensions and anchor alignment.
- Adding many timed sequences inside one RAF loop can regress readability; use declarative animation map to reduce branching.
- Multi-mascot features (pull-up/divide) are the only items that require architecture expansion beyond the current single actor.
