# Parcel site — design

A static, hand-made "parcel" personal site for GitHub Pages. Visitors cut the
tape on a box, peer into the dark, look down into it, and read a small
introduction book.

## Understanding (from the brief)

- **Owner supplies:** artwork / artwork layers, a portrait photo, handwriting
  elements, and the introduction text. Nothing biographical is invented; every
  missing asset falls back to a clearly labelled placeholder. (The owner later
  kept the generated cardboard box as the finished box art, in `assets/art/`.)
- **Mood:** warm, playful, curious; paper textures, imperfect edges, soft
  shadows. No pixel art.
- **Hosting:** static files only, relative paths (works at `user.github.io/`
  and at `user.github.io/repo/`).

## Experience states

```
loading ─LOADED→ sealed ─CUT_START→ cutting ─CUT_DONE→ opening ─OPENED→ dark
dark ─REVEAL→ revealing ─REVEALED→ overhead ─OPEN_BOOK→ lifting ─BOOK_OPENED→ reading
reading ─CLOSE_BOOK→ closing ─BOOK_CLOSED→ overhead
(sealed|cutting|dark|overhead|reading) ─RESTART→ sealed
```

`opening`, `revealing`, `lifting` and `closing` are *busy* states: user events
are ignored while they run, which prevents overlapping transitions and double
activation. The current state is mirrored to `<body data-state>` so CSS can
style each stage.

## Architecture

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `content/site.js` | Owner-editable config: asset paths, sounds, labels, book title | — |
| `content/book.md` | Owner-editable book text (Markdown-lite) | — |
| `js/core/state-machine.js` | Pure transition table + busy lock + listeners | — |
| `js/core/tween.js` | rAF tweens + easing, reduced-motion aware | — |
| `js/core/env.js` | Reduced motion, fine pointer, storage helpers | — |
| `js/geometry/homography.js` | Pure 4-point perspective solve (screen → tape) | — |
| `js/tape/cut-tracker.js` | Pure, immutable cut progress (unique length bins) | — |
| `js/tape/tape-view.js` | SVG rendering of tape halves + traced slit | cut-tracker |
| `js/tape/cutting.js` | Pointer/touch/keyboard cutting controller + sound | homography, cut-tracker, audio |
| `js/scene/parcel.js` | Builds the CSS-3D box, flaps, interior, contents | site config |
| `js/scene/camera.js` | Camera (tilt/spin/zoom) + interior light tweens | tween |
| `js/audio/sound.js` | Web Audio: unlock on first gesture, mute, loops | — |
| `js/loader/preload.js` | Preload images/fonts/sounds with progress + fallbacks | site config |
| `js/book/markdown.js` | Pure Markdown-lite → block list (escaped, safe links) | — |
| `js/book/paginate.js` | Pure pagination with an injected `fits()` measure | — |
| `js/book/layout.js` | Pure viewport → spread/single page size + font size | — |
| `js/book/book-view.js` | StPageFlip integration, controls, keys, indicator | page-flip, paginate |
| `js/book/flyer.js` | Lift-from-box / zoom / cover open & close animations | — |
| `js/ui/controls.js` | Mute + restart controls | sound, machine |
| `js/main.js` | Wiring | all |

### Viewpoint change

The parcel is one CSS-3D object (`preserve-3d`) seen through a perspective
camera. The three-quarter view is `rotateX(58deg) rotateZ(-34deg)`; the
overhead view is `rotateX(0) rotateZ(-3deg)` plus zoom. A single tween drives
`--tilt`, `--spin`, `--zoom` and the interior `--light` together, so the camera
move and the brightening are one continuous motion. Owner artwork is applied as
face textures, so one set of layers serves every angle.

### Tape cutting

The tape's four corners are tracked with zero-size probe elements; their
projected screen positions give a homography that maps the pointer into tape
space. The tape length is split into 48 bins; a bin is cut only when a
pressed pointer *moves* across it while on the tape. Re-tracing the same bins
adds nothing. 85 % of bins opens the box. Leaving the tape or releasing pauses
cutting and silences the loop; progress is kept. Keyboard: the tape is a
focusable `role="slider"`; holding → / Enter / Space advances the knife.

### Book

Markdown-lite (`#` headings, `>` handwritten notes, lists, images, `---` page
breaks) is parsed into blocks, then paginated into pages that fit the current
page size (measured in a hidden page). Small screens get a single-page view
with ≥ 16 px text instead of a shrunken spread. StPageFlip (MIT, vendored)
provides the paper fold, moving shadows, corner drag with natural
complete/cancel, and swipe. A separate "flyer" book handles lift, zoom and the
hard-cover opening, then hands over to the flipbook at identical geometry.

## Accessibility & motion

- Keyboard path through every stage; visible focus; labelled controls;
  `aria-live` status messages.
- Custom cursors only under `(hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion`: camera and zoom become cross-fades, page buttons
  jump instead of animating, idle wobble stops. Every stage is still reachable.

## Testing

- Unit (`node --test`): state machine, homography, cut tracker, markdown,
  paginate, layout, tween easing.
- E2E (Playwright, installed Chrome): full sequence with mouse, touch and
  keyboard; mute/restart; page turns (click, drag, keys); reduced motion;
  asset loading with a missing asset.
