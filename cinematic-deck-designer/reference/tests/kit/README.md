# Deck check kit

Built for The Mark (an archery-range deck) and kept generic: the tools read slide ids, builds and sound calls from the DOM and `window.__deck`. Examples below use The Mark's slide ids (cover, archer, lawless, stay, greater = the sacred, silent slide); use your own. Install with `npm i` in this folder (or copy it into the project's `tools/`).

Headless checks for the deck. Everything runs Playwright with `channel: 'chrome'`, headless, so nothing touches the screen,
mouse or keyboard. Run the node tools from this folder (or set `NODE_PATH` to `tools/node_modules`). Run the python tools
with plain `python3` where they use PIL (`sheet.py`, `projsim.py`); `words.py` is stdlib-only and runs with `python3 -I`.

Put every output under the session scratchpad (`<scratchpad>/<label>/`), never inside the project folder.

`lib.js` holds the shared helpers: launch, open a deck at 1920x1080, wait for fonts and the world's bakes
(`window.__worldBakes() === 0`), read the slides (ids, builds, transition, part, hush) from the DOM and `window.__deck`,
settle a slide, wait until the deck is idle.

Build a deck first: `cd <copy> && python3 -I assemble.py out/mark4.html`.

| tool | usage | what it checks | exit |
|---|---|---|---|
| jscheck.js | `node jscheck.js <deck.html>` | each inline JS `<script>` (JSON and `src=` skipped) parses (vm.Script) | 1 on a syntax error |
| check.js | `node check.js <deck.html> <outdir> [slides\|motion\|all] [ids...]` | see below | 1 on a page error |
| frames.js | `node frames.js <deck.html> <outdir> <slideId> [build] <ms,ms,...>` | real-time frames of one arrival or build | 0 |
| sheet.py | `python3 sheet.py <out.png> <img...> [--cols N] [--w W] [--sort]` | contact sheet, 3 across, labelled | |
| qrread.js | `node qrread.js <png> [x,y,w,h]` | decodes a QR (jsqr), optional crop | 1 if none |
| snd.js | `node snd.js <deck.html> <out.json>` | sound log, the sacred slide's silence, master peak, flush | 1 on failure |
| tool.js | `node tool.js <deck.html> <outdir>` | presenter toolkit end to end | 1 on failure |
| sv.js | `node sv.js <deck.html> <outdir>` | speaker view: panel toggles, sizing, running script, notes editing | 1 on failure |
| phone.js | `node phone.js <deck.html> <outdir>` | phone portrait and landscape, touch | 1 on failure |
| rm.js | `node rm.js <deck.html> <outdir>` | reduced motion: every step still after 1.5 s | 1 if any moves |
| words.py | `python3 -I words.py <a.html> <b.html>` | on-screen wording and notes identical | 1 on a difference |
| contrast.js | `node contrast.js <deck.html> <outdir> [ids...]` | worst-decile text contrast on the real background | 0 (a measurement) |
| projsim.py | `python3 projsim.py <in.png> <out.png> [black] [gamma] [blur]` | a rough projector look for dark frames | |
| sync.js | `node sync.js <deck.html> <out.json> [rates] [ids...]` | audio-picture sync proof | 1 if a pair is off |
| perf.js | `[PERF_CPU=4] node perf.js <deck.html> [ids...]` | frame pacing while an arrival plays | 0 |

## check.js

- **slides** (default): every slide via `__deck.go(i, {instant, toEnd, force})` then `__deck.settle()`, saved as
  `s-NN-<id>.png` (the standby toast is hidden). Layout warnings per slide: a visible text line (glyph core box, from
  Range rects) outside the 60 px safe margin, or text boxes of two different elements overlapping by more than 8% of the
  smaller one. Visible means no ancestor with `display:none`, `visibility:hidden` or opacity under .05; speaker notes skipped.
- **motion**: each slide's arrival played in real time from the previous slide settled (the cover from standby with the
  first click), then each build, 4 to 9 frames per set piece as `m-<id>-N.png`. Frames land on the moment's beats: every
  set-piece sound is scheduled ahead (`at`) when its moment starts, even with sound off, so check.js wraps the sound object's
  methods and puts a frame 60 ms after each impact, release, stamp or freeze (re-planning as later beats arrive), one 700 ms
  after the last, and fills the rest over the move. Budget: the arrival 4 (up to 7 with fewer builds), the builds share the
  rest, later builds first. `report.json` lists every frame with its planned label and real capture time (a screenshot
  takes 100 to 300 ms). For a dense look at one moment use frames.js. `CHECK_DEBUG=1` prints the beats.
- **all**: both. Page errors and console errors are always collected in `report.json`.
- Example: `node check.js ../out/mark4.html $OUT/check all` then `python3 sheet.py $OUT/stay.png $OUT/check/m-stay-*.png --sort`.

## frames.js

With no build: the slide's arrival from the previous slide settled (the cover: the first click from standby). With build k:
the slide shown at build 0, builds 1..k-1 played (3 s each, no `settle()`, whose `.settled` class would freeze animations),
then build k fired. Frames at the given ms after the trigger, as `f-<id>[-b<k>]-<ms>.png`; the actual capture time is printed.
Example: `node frames.js ../out/mark4.html $OUT/fr archer 3 200,700,1100,1500,2000,2600,3200`.

## snd.js

Taps the deck's AudioContext (every `connect()` to its destination also feeds an AnalyserNode, read every 20 ms) and wraps each
method of `__deck.sound` to log calls. Checks: no audio context before M; M (a real key press) turns sound on and the bank gets
ready; then a presenter walk with `next()` from standby through every build and slide (each until idle and 3 s past the
last sound it scheduled), printing per step
the event calls and the output's peak and RMS in dBFS. The hush slide (the sacred one, `data-hush`) must make no event calls while sound
is on, and its output must stay under -50 dBFS RMS after its first second. The master peak must stay at or under -0.3 dBFS.
Flush: a flight followed, the moment it lands (`go()` refuses while busy), by a jump to the hush slide; from 600 ms after the
jump the output must stay under -50 dBFS RMS (nothing of the last scene stacks into the next). It also measures the audio clock
against wall time and prints it. The JSON has every step with its calls (time from the trigger, name, `ok`, arguments).

## tool.js

1. `window.__deck` has go, next, prev, cur, step, busy, N, settle, hear, standby, sound.
2. S opens the speaker view (a popup); it mirrors the slide on stage ("n/N" with the title as its tooltip, the Now preview's slide, notes)
   and follows `next()`.
3. Cue words: on the first slide after the cover with a build cue, `__deck.hear(<running transcript>)` with the build's cue
   word brings build 1; at the last build, after 2.5 s, the next slide's cue word moves on. The transcript is cumulative, as
   Chrome's speech recognition delivers it.
4. T opens the timing panel with a row and a target for every slide.
5. Editor: E, click the largest text block on `being`, size 1.3 through the editor's size control, double-click and retype it,
   Esc, Save. `showSaveFilePicker` is stubbed to capture the written file, saved as `edited.html` in the outdir; it must pass
   jscheck, and opened in a fresh context (no localStorage) the retyped text and the 1.3 scale must be there.
6. Speed: the editor's global speed at 0.5x and 2x, each in a fresh context; the busy time of the first flight between parts
   (fear to split in The Mark 3) must scale by about 2 and 0.5.

## sv.js

The speaker view from `reference/speaker-view.js`. Needs `window.__deck` with go, settle, busy, `state()` and `buildDoc()`, and
slide 3 with builds.
1. Every combination of the three toggles (`button.tg`: Notes, Now, Next) at 1440x880, 1024x700 and 1920x1080: each hides only
   its own panel, shown panels keep a usable size, the preview frames are rescaled, nothing scrolls sideways; with voice off the
   cue box is hidden and the status line shows.
2. A+ / A− change the notes size by 2 px a step; the size is kept after reopening.
3. The layout button cycles the previews right, bottom, left, top, hidden and back; the toolbar sits under everything.
4. The script holds every slide (`.old`, `.cur-s`, `.fut`), the current part sits in the top 30%, later text is at 50% with a
   `--cut` set, cues are green on the current slide and red later, the status line is filled, the toolbar shows `n/N` with the
   title as its tooltip, the script glides to the next slide with in-between positions and scrolls back, and a move caused by a
   spoken cue (`__deck.hear`) is under 25% of the way at 280 ms where a click's is over 50%.
5. Dragging the bar widens the previews by 500 px or more, the width is kept, Reset sizes restores it.
6. Edit notes: one box per build, focused; arrow keys type; Cmd/Ctrl+Enter saves into the slide's `.notes` and the edit state
   with the builds kept; Esc cancels; changing slide mid-edit saves; `buildDoc()` carries the edit; it survives a reload.
7. On the last slide the Next preview is the end card and no later slides remain in the script.

## phone.js

isMobile, hasTouch, DPR 3. Portrait 390x844: the turn card shows, a tap hides it. Both orientations: the stage fits, the deck
starts in standby, a tap starts the cover, a later tap moves on to slide 2, no page errors. A left swipe (CDP touch events)
is reported as `WARN` when it does not move on; it is not a failure. Shots `ph-<orient>-N.png`.

## rm.js

`reducedMotion: 'reduce'`. A presenter walk with `next()` through every step; 1.5 s after each step (and after the deck is idle)
two frames 400 ms apart: still means under 0.1% of pixels change by more than 6/255 and no running CSS or WAAPI animation.
A moving step is looked at again at 4.4 s and labelled "settles late" or "keeps moving". Shots `rm-NN-<id>-k<step>.png`.

## words.py

Parses each `section.slide` with the stdlib HTML parser: on-screen text is every text node outside `aside.notes` (SVG
`<text>` included, scripts and styles skipped), notes are the text inside `aside.notes`. `<br>` and block tags count as
spaces, whitespace collapses, and a difference in whitespace alone is printed as "whitespace only (ok)" and passes, so
added spans and line breaks pass. Any other difference prints the changed fragments.

## contrast.js

Each slide settled, every build shown, rendered twice: (A) with text and (B) with only the glyphs hidden (text nodes wrapped in
`<x-t>`, then `visibility:hidden`; SVG `<text>` hidden), so cards, glows and the world stay; A is taken after the wrapping so
both share one layout. For each text line (glyph core box): the text luminance is the median of A's pixels that differ most
from B; the WCAG contrast is taken against every B pixel in the box; the score is the worst decile (10th percentile). LOW when
under 4.5 for text under 32 px (stage px) or under 3 for larger. Writes `contrast.json` and `c-<id>-a.png` / `c-<id>-b.png`.

## projsim.py

Gaussian blur (1.2 px at 1920 wide), 12% desaturation, black lifted to 6% and the top squashed to 92% of range. Judge dark
frames on its output: `python3 projsim.py s-14-greater.png s-14-greater-proj.png`.

## sync.js

What it measures, pragmatically:
- Sound: `AudioBufferSourceNode.start()` is hooked. Each source is tagged with the `sound` method that made it (sources built a
  task later inherit the last call within 120 ms). Per call, the loudest one-shot source gives the transient: the first sample
  over half of that source's peak inside its played region (bank entries share long buffers). Audible wall time = wall time at
  `start()` + (audio time of the transient - `currentTime` at `start()`) + latency: one audio second per wall second, as a
  real-time device plays it.
- Latency: headless Chrome reports an output latency of about 170 ms on this Mac, which would clamp every immediate sound late.
  sync.js pins `outputLatency` to 20 ms and `baseLatency` to 5 ms (a laptop's own output or HDMI), so the deck schedules as it
  would on a wired output, and the projection adds the same 25 ms.
- Clock: the audio clock is measured against `performance.now()` and printed. After the restart it ran at 91 to 100% of wall
  time (it drifts); earlier this Mac's headless audio clock ran at 42 to 48% (coreaudiod busy). Real output timestamps would
  carry that drift (a sound scheduled 2.25 s ahead at 91% plays ~220 ms late in headless Chrome); the projection above does
  not, because it never waits on the audio clock. That is why sync.js projects instead of listening.
- Picture: an event's frame is the first `requestAnimationFrame` after it plus `SYNC_FRAMES` frames (env, default 2, about how
  long Chrome on macOS takes from rAF to glass). Events: a slide gaining `.hit` (flight impact, cover miss, finale), `.loosed`
  (a release), `.on` on the `data-replay` slide (the hard cut), `.stamping` + 160 ms (the glyphs meet the paper at 42% of the
  .38 s stamp), `firing-N` removed (a volley's last arrow lands), and, for a call made with no `at` (landHit, a snap at the
  release), the frame of the call itself.
- Pairing: a call made with no `at` was made on the frame that drew its moment (landHit, a snap at the release), so that
  frame is its anchor. A call scheduled ahead pairs with the nearest class event of its kind: thunk to hit / firing, snap to
  loosed, stamp to stamp, nock to replay. Textures (whoosh, creak, pass, rewind, slow, freeze, pull) are not paired. Calls with
  an `at` and no DOM anchor are listed as unpaired: the split's knocks, the archer's grips (fingertip contact is inside the
  hand's WAAPI keyframes), the seed's far knock (its light lands at 4.15 s, before its sound at 4.37 s, on purpose: distance)
  and the stumble's quiver thunk.
- Each step rests until the deck is idle and 1.5 s past the last sound it scheduled; an arrival at least 4.2 s of deck time
  (the lawless stamp is a timer 3.6 s after its arrival). A pair's label names the walk step during which the call was made.
- Output: each pair's offset (sound minus picture; + is late), and per rate the median (the display model's bias) and the
  spread (largest distance from the median; independent of the model, the number to trust). Pass: every |offset| <= 34 ms.
- Rates are the editor's global speed (0.5 and 2 set through `#ed-gs`). Default `1,0.5,2`, the whole talk; name slide ids to
  run only those (each from the previous slide settled, then its builds).

## perf.js

`node perf.js <deck.html> [ids...]`: frame times while each named slide's arrival plays (the cover from standby). Prints mean,
p95, worst, and the share over 20 and 33 ms. Headless numbers are relative: run the before-state and the new build back to
back, with nothing else running (a background check or sync run skews them). Gate: p95 <= 18 ms and at most 2% over 20 ms.
On the build Mac the unthrottled run of The Mark 3 sits at 16.7 ms on every set piece, so it cannot tell builds apart;
`PERF_CPU=4 node perf.js ...` throttles the CPU 4x through CDP (a slower presenting laptop) and does show hitches
(the cover: worst 100 ms, 3% over 20 ms). Use the throttled run to compare builds; the gate stays on the plain run.

## seams.js

`node seams.js [--run 256] [--step .8] [--out dir] <png...>`: finds straight seams, the edge of a layer, band or gradient that
ends inside the frame, even faint ones under grain and stars. Luma is averaged in 32 px blocks along a row (or column) and 4 px
across it; a seam is a one-signed step of more than `--step` levels that stands out 2x from the same difference 4 px either side
(a step, not a ramp) over at least `--run` px. Text, props and fences have real straight edges too, so run it on world-only frames
or compare before and after on the same frames, and read the marked copies (`--out`, seams in red). Feed it settled shots and
arrival frames: many seams only show while the camera moves.

## aspect.js

`node aspect.js <deck.html> <outdir> <WxH,WxH,...> [ids...]`: every slide settled at each window size (for example
`1920x1080,1280x720,1440x900,1920x1200,1024x768`), saved as `a-<W>x<H>-NN-<id>.png`. Check the letterbox, the stage edges and
that no world layer ends inside the frame at other aspect ratios.
