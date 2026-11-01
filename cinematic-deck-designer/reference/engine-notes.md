# Engine notes (learned building two cinematic decks: an elevator-and-building world and an archery-range world, The Mark 1–5)

## Where things live in a reference deck (the elevator deck)

Line numbers are approximate. Search for the section comments.

**CSS**
- `/* ===== Tokens */` and `Type`, `Motion`: design tokens, and the arrival and build classes.
- `Presenter chrome` and `Voice, timing and editor chrome`, from about line 478: reuse these almost as they are and restyle them to the world.
- The world-specific CSS sits in between: building, lift, corridor, flaps, QR dots, dusk cover. Study it; don't copy it.

**HTML and JS**
- About line 1023: the `#deck-edits` JSON (saved state) and `window.__deckSrc = document.documentElement.outerHTML`, captured **before** `#deck-js` runs. This is what makes Save write a clean file.
- `#deck-js`:
  - `what this deck remembers`: edits plus a working copy in localStorage. Change the key prefix for each deck.
  - `animation speed`: `RATE`, `tm()`, `later()`, `setRate`.
  - `editable things`: per-slide text and blocks, keyed by slide and order.
  - `sound`: a synthesized WebAudio object, off until M. Methods include clack, thunk, step, slide, beep, hum(ms), whoosh and ding; write the world's own.
  - `moving between slides`: `go`, `clonePanel`, then the transports `corridor()` and `elevator()`, then `arrive`, `next` and `prev`.
  - `slide moments`: per-slide `hooks.pre` (before arrival) and `hooks.still` (settled).
  - `notes`, `previews`, `speaker view`, `overlays`, then voice, timing, editor and the `buildDoc()` save.
  - `window.__deck`: the test API, near the end.

## Rules that cost hours to learn

- **Speed scaling.** `RATE` = global speed × per-slide speed. Every timer goes through `tm()`/`later()`, which divide by RATE. Patch `Element.prototype.animate`, and use a MutationObserver over `document.getAnimations()`, so that every animation gets `playbackRate = RATE`. Never use a bare `setTimeout` for choreography.
- **WAAPI fill.** The first animation on an element uses `fill:'both'`. Later ones use `'forwards'`, or they fill backwards over the earlier ones and the element jumps. Cancel all animations when a transport ends.
- **Warm arrival.** After a transport, the real slide must not replay its entrance. Add `settled` and `live` together, then remove `settled` two frames later. Slides whose entrance is the point (cover, reveals, QR) use `data-enter="show"` and arrive cold.
- **Copies of slides.** Transports render copies of slides (`clonePanel`):
  - Copies have no ids, so style looks with **classes**, not `#id`.
  - Strip transient classes (full, over, exit).
  - A copy of the destination shown *ahead* of arrival uses `hooks.pre`, not `hooks.still`. Otherwise it shows the lit end state, then flickers when the real slide arrives.
- **`hidden` vs display.** A `display:flex` panel overrides `hidden`. Add `[hidden]{display:none!important}` for panels, or invisible panels will swallow clicks.
- **Double-click under pointer capture.** The event retargets to the stage. Use `document.elementFromPoint`.
- **One-line JS.** A `//` comment inside a one-line statement comments out the rest of the line. Use `/* */`.
- **TDZ.** Don't call anything that reads a `const` before its declaration line, for example setRate on load.
- **Perspective.** For floors and corridors, set `perspective-origin` to around 50% 30% so the floor is in view.
- **Seams.** Adjoining 3D faces should share one continuous gradient (`background-size` across faces with offsets), or seams show.
- **QR codes.** Rebuild them as SVG dots from the PNG modules, so they can light up module by module. Validate the three finder patterns, and keep a quiet zone.

## Testing

- The kit: `tests/kit/` (see its README). Playwright with `channel:'chrome'`; node tools take `<deck.html> <outdir>`.
- `python3 sheet.py out.png frame1.png …`: 3-column contact sheets. Open them and look.
- macOS has no `timeout`. Run long jobs in the background and wait for them to finish.
- Never write test output over the user's files. Build to fresh paths in the scratchpad, and copy the final file into the user's folder under a new name.

## Lessons from The Mark (an archery-range world, 2026)

- **Lasting workspace.** A Mac restart cleared `/private/tmp` and took every source, tool and an unsaved round with it. Only the delivered HTML files survived. Keep sources and tools in a project folder. A built deck can be split back into parts, because its CSS and `#deck-js` are inline; find the end of each with `</style>` and `</script>`, never a bare `</`, which also appears inside JS strings.
- **Owned parts.** Split the source into `world` (painted scenery and figures), `motion` (camera, transports, fx), `sound` and `type` (CSS and markup), joined in a fixed order. Then one fixer per part can work in its own copy, and a merger copies the owned files back and reruns every gate. Two writers in one checkout break each other's builds.
- **Sound that pros accept:**
  - Diegetic Foley from shaped noise. Render a bank into an OfflineAudioContext the first time M is pressed.
  - One convolution space and a soft-clip master.
  - Pan from the event's x position.
  - Check tonality with NSDF over 120 ms windows, staying under about .6.
  - The level ladder runs climax > hero hits > volleys > arrivals > transitions.
  - Transitions repeated at set-piece level crowd the arc, so keep them about 10 dB under the arrivals.
- **Sync.** A WAAPI or CSS animation shows its first moving frame 31–40 ms after it starts. Schedule contact sounds at `t + ANIM_LAG*RATE` (about .033). Headless Chrome's audio clock can run at 40–70% of wall time under load, so sync proofs must project scheduled starts onto the wall clock.
- **Canvas cost.** Never use `ctx.filter`, `shadowBlur` or live `getImageData`. Soften offscreen with box averages once at load, then place the result as an `<image>`. An SVG mask on a large animated figure cost dropped frames, so prefer a pre-baked image.
- **Contrast on painted skies.** Measure worst-decile contrast against the rendered background, with opacity included. Dimmed verses (opacity .45) on a sunrise fell to about 2:1. Keep supporting lines at .8 or more.
- **Grade and payoff.** A filmic grade that pulls target colours toward grey kills the payoff ("gold" no longer reads as gold). Exempt hero colours from the grade.
- **Payoff legibility.** A hit on a far target only about 40 px wide is invisible from the room. Make payoff objects big enough, or make the hit a light event (flash, pillar, rings) that reads at a distance.
- **Flight paths and type.** Arrows or particles streaking through words read as strikethroughs. Keep a type-plane map, and route motion behind or around it.
- **Load skews measurement.** Several decks rendering at once pushed the load average to 100+, which made perf and real-time capture meaningless. Run measured gates on a quiet machine, back to back with the before-state.
- **Swaps inside a slide.** A flight drawn on a canvas and swapped for an SVG copy at impact must be drawn by the same rules, number for number: colours (including dark and gold variants), vane size, nock, outline, highlights, light and size. Otherwise it changes colour or size as it lands (The Mark 4: dark arrows flew cream and landed brown, vanes grew 15%, far arrows doubled in thickness). Write one geometry and draw both from it; ease any size or angle change before the swap; show divots, shadows and debris from the impact frame, so only the object itself swaps; swap on one exact frame (no crossfade, which goes see-through). Prove it: hold the last frame before each swap and the first after, and compare crops against a noise floor.
- **CSS beats SVG attributes.** A class rule such as `.shaft{stroke-width:5}` overrides the `stroke-width` attribute on every element, so all sizes draw the same. Keep geometry out of CSS, or write it inline in `style`.
- **No hard steps in gradients.** A glow or fade drawn in a few bands (the Milky Way, stars thinning toward the horizon, a radial vignette cut off by its rectangle, blur bands in depth) leaves straight lines across the sky that a projector and a camera move make obvious. Draw one smooth ramp (thin strips of 6–10 px, or a gradient already clear at its box's edges). Check with `tests/kit/seams.js` on settled and arrival frames, world only, and at several window sizes (`aspect.js`).
- **Cover every jolt.** A camera shake, landing dip or tear moves the world; zoom in just enough to hide the world's edge at the worst offset, or the edge flashes for a frame.
- **One speaker view for every deck.** It lives in `reference/speaker-view.js` and is pasted in unchanged; only the adapter differs. A deck whose previews need more than a cloned slide (painted scenery, settled hooks) passes `paint(doc, box, i, upTo)`; a deck with shared SVG `<defs>` passes them as `previewHTML`, or clipped and gradient art draws blank in the preview frames. Set `speaker.voiceAt` around the voice handler's check, so a move a spoken cue causes glides slower (the presenter's eyes are on the room, not the notes). Hand the window's keys to the deck's own handler (minus S, which belongs to the main window), so clicker keys and calibration keys work there too. Notes edits must go into the edit state with the original kept, so undo, reload and Save all carry them. A scroll container's mask stays put while its content scrolls, which is what lets the notes fade by position on screen.
- **Test `next()` with builds in mind.** On a slide with builds, `next()` reveals a build rather than changing slide; use `go(i)` when a test means "another slide".
- **Save straight back to the file.** A file handle from `showSaveFilePicker` can be kept in IndexedDB (keyed by the page's path), so after one pick every Save, even after a reload, writes to the deck's own file; check `queryPermission` and ask with `requestPermission` before writing, since a stored handle comes back without write permission. `reference/deck-save.js` does this; use it as is.
