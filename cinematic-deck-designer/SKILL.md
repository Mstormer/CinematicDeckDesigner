---
name: cinematic-deck-designer
description: Cinematic Deck Designer — turn a talk manuscript or outline into a one-of-a-kind cinematic HTML presentation built around a custom design world (3D transitions that carry the talk's logic, a unique visual per slide, synthesized sound, speaker view, voice cues, timing, in-page editor that saves into the file). Walks the user through goals and a few clarifying questions, pitches three design worlds, storyboards, builds and checks frame by frame. Use when someone wants an impressive, custom-designed presentation or deck, says "/cinematic-deck-designer". For the particle-light style, use particle-present instead.
---

# Cinematic Deck Designer

One talk, one world. You turn the user's manuscript into a single self-contained HTML deck that makes a room lean forward. It has one governing metaphor and a different visual on every slide. Transitions carry meaning, and the presenter toolkit is complete.

**Quality bar.** The work of a top title studio: a deck that graphic, VFX and audio professionals would respect. If `reference/private/QUALITY-BAR.md` exists (a local, untracked file), it names your own reference decks: open them first, and match or beat them without reusing their world.

**Reference material** is in `reference/` next to this file:
- `private/` (optional, never committed): a reference deck's source and build script, if you keep one locally. Reuse its presenter toolkit and study its motion code.
- `tests/kit/`: the current check kit (layout, motion frames, seams, window sizes, perf, sound walk, sync, toolkit, speaker view, saving, phone, reduced motion, contrast, projector simulation, QR, wording).
- `engine-notes.md`: hard-won rules. **Read it before building.**
- `speaker-view.js`: the speaker view every deck uses, pasted in unchanged (see Stage 5).
- `deck-save.js`: saving the deck back into its own file, pasted in unchanged (see Stage 5).
- `deck-ui.js`: the presenting controls (HUD, notes lower third, timing panel, help, slides overlay, voice cues, keys), pasted in unchanged. Notes (N) is a lower third no taller than 150 px by default: only the current slide's notes, formatted like the speaker view, the current part at the top with the next two lines at half strength, gliding up as builds advance, and a cue line that always shows the next cue (the next build's, then the next slide's) so the presenter knows what to say; A−/A+ and a drag handle on its top edge resize it, remembered per browser.
- `deck-editor.js`: the slide editor, pasted in unchanged. Deck-specific controls (a light image's sliders, animation speed) plug in as `sections`/`targets` and show only when the deck supplies them.

Work in the stages below. Stop and wait for the user only where it says **WAIT**. Ask questions in plain chat (or with AskUserQuestion when it is available), each with 2–4 options and your recommendation first.

## Stage 0 · Get the talk

The user must supply the content. This can be a manuscript, script, outline, notes, or an existing deck to rework, as a file, a paste or a link.
- If nothing is attached, ask for it and **WAIT**. Do not invent the talk.
- An outline is enough. Note which parts you will draft on-screen words for, and keep the speaker notes in the user's own words wherever they exist.
- **Every on-screen word comes from the user's material.** That matters most for the call to action and the closing lines. A phrase you write yourself, even a short one like "confess it" or "stay home", is marked *drafted* in the storyboard and needs the user's OK. Never let an invented phrase reach the build unmarked.
- Also ask where the finished file should go, unless it is obvious. The default is the folder the source came from.
- **Check free disk space** (`df -h ~`). If less than 10 GB is free, warn the user before going on. Building and checking a deck needs about **25 GB free**: check rounds write thousands of screenshots and frames (one deck reached 20 GB), on top of Chrome, Playwright and the project. With less, runs can fail partway or fill the disk. Suggest emptying the Trash or clearing old build files. If the user wants to go on anyway, keep every check round small (fewer frames, trash each round's frames as soon as its sheet is reviewed) and say which checks were cut.

## Stage 1 · Read the talk

Read everything. Before asking anything, write a short diagnosis:
- **Shape:** a ladder (levels), journey (stages), reveal (one big turn), contrast (before/after), toolkit (parts of a whole), countdown or story.
- The one sentence the audience should remember (your draft).
- The 3–5 natural chapters, and where the emotional peak is.
- Concrete images, objects or places the talk already mentions. These are the best raw material for the world.

## Stage 2 · Establish the user's goals, then ask

Goals come first and are never skipped. Even if the material seems to make them obvious, propose your best guess for each and have the user confirm or correct it:
- **A. Outcome:** what should the audience DO afterwards (sign up, change a habit, try a tool, give, adopt a plan, tell others)? What should they THINK and FEEL?
- **B. The presenter's success:** what makes this a win (invited back, a decision approved, QR scans, being quoted, a follow-up meeting)? How will they know?
- **C. Occasion and stakes:** keynote, workshop, pitch, sermon, class or board meeting? Is the deck the main event or support? Will it be shared or reused later?
- **D. Audience starting point:** what do they already believe or know? What doubt must the talk overcome?

Then ask **at most 4** more questions, and only what the material and goals don't answer:
1. **Room:** who, how many, and on what screen (projector, LED wall, laptop, Zoom)?
2. **Tone ceiling:** how theatrical can it get, from quiet and elegant to full spectacle?
3. **Constraints:** running time, brand colours or fonts, things to avoid, accessibility.
4. **Presenting style:** clicker only, voice cues, speaker view on a second screen, live editing?

Also confirm two things, folded into the goals questions so they don't add to the count:
- **The link or QR:** where it points and how it is labelled. Never assume it is for this talk; it may lead to a series, a site or a sign-up.
- **Sacred moments:** any slide or verse that must stay still and silent, however spectacular the rest is. Treat it as a hard rule in every later version.

**WAIT.** Then write a **goals brief** of 6 lines or fewer:
- the outcome;
- the measure of success;
- the audience shift (from → to);
- the sentence to remember;
- any sacred (still and silent) moments.

Get the user's OK on it. Every later decision serves this brief. Where spectacle would work against a goal, such as a board that wants sobriety or a grieving congregation, the goal wins.

## Stage 3 · Pitch three worlds

Derive three distinct worlds from the talk's shape and subject, not from a template. For each:
- **Name and premise.** For example: "The talk is a night train; each chapter is a station."
- **The transport.** This is the signature move between chapters, like the elevator. It must express the talk's logic: going deeper, further, higher, closer, or back in time.
- **Three signature moments.** These are set pieces people talk about afterwards, such as a cover that assembles itself, a split-flap board rolling, or a QR code drawn dot by dot.
- **Look and sound:**
  - a palette of 4–6 named hex values;
  - typefaces and their roles;
  - the texture of the world (paper, glass, steel, starlight, chalk, film grain…);
  - 4–6 sounds that belong to the world, off by default: **diegetic Foley** such as wood, string, cloth, wind, paper, glass or footsteps. Build them from shaped noise, filters and envelopes, never from pitched tones, chimes, beeps or hums. Synth tones read as "elevator noises" and cheapen the whole deck.
- **How it serves the goals brief:** which moment moves the audience from → to, and how the ending drives the action.
- **One risk,** and how you will keep the world from upstaging the speaker.
- **A small ASCII storyboard** of the cover and one transition.

Make the three genuinely different: one safe but beautiful, one bold, one surprising.

Starter ideas by shape. Mix them or ignore them; the subject should lead:

| Shape | Ideas |
|---|---|
| Ladder | elevator, mountain ascent, telescope zoom, ocean dive by depth |
| Journey | transit map with a moving train, sea chart and voyage, trail with waymarks |
| Reveal | darkroom print developing, curtain and stage, lens pulling focus |
| Contrast | split screen that slides, scales tipping, two roads diverging |
| Toolkit | watch movement, workbench, orrery, cathedral blueprint being drawn |
| Story or time | film reel, turning pages, seasons on one tree |

Recommend one. **WAIT** for the user's pick, or a mix.

## Stage 4 · Storyboard

Put the goals brief at the top. Then write a slide-by-slide table with these columns:
- #
- chapter
- the slide's job for the goals (one phrase)
- on-screen words (few)
- the visual (unique for every slide; no two slides share a layout)
- the motion and when it plays
- build steps
- the spoken cue word for each build

Mark the transport and signature moments. The speaker carries the words. End on a call to action that matches the outcome (a QR code, link or ask), never on "Questions?". Cut or merge any slide that has no job.

**WAIT** for changes, then build.

## Stage 5 · Build

Produce one self-contained `.html` file that works offline:
- fonts embedded as base64;
- no CDN and no frameworks.

**Work in a lasting project folder,** such as `~/Documents/CCode/<Talk>`: source parts, a small `build.py` that embeds fonts, icons, notes, cues and any images, the test kit, and the built output. Never keep sources only in the session scratchpad or `/private/tmp`, because a restart wipes them. Use the scratchpad only for screenshots and other throwaway output. Check runs fill the disk fast (one deck left 20 GB of frames), so keep them lean while you work:
- each check round writes into one folder per round and reuses it;
- move raw frames to the Trash once their contact sheet is made and reviewed;
- before a round, check free space (`df -h`); under about 15 GB free, clean up first.

For anything bigger than a few slides, split the source into owned parts (world, motion, sound, type) that `build.py` joins in a fixed order, so parallel agents never edit the same file. Long jobs keep a `progress.log` after each task, so a step cut off by a usage limit or a restart can resume.

Get fonts and icons from npm into a scratch `vendor/`:
```bash
npm i @fontsource/<family> lucide-static
```
Pick typefaces that fit the world, not a house default.

**Craft:**
- **Stage:** a fixed 1920×1080 stage scaled to any screen by `--k`.
- **Motion:** CSS 3D (preserve-3d, perspective, camera rigs that animate a world container) and the Web Animations API. Use SVG for icons and line drawing.
- **Composition:** every slide gets its own. The transport plays between chapters, with simpler moves inside a chapter. Arriving and leaving should feel physical: anticipation, overshoot, settle.
- **Accessibility:** respect `prefers-reduced-motion`. Text must be legible from the back row: at least about 28px at 1080p, with strong contrast.
- **Sound as a mix, not a list of effects:** one acoustic space, stereo placement that follows the picture, a level arc that peaks at the climax, quiet transitions under the set pieces, a soft-clip safety stage, and sounds that land on the picture's contact frame, within about 2 frames. Sacred moments are digital silence.
- **Budgets:** every transport and set piece at p95 ≤ 18 ms per frame with ≤ 2% of frames over 20 ms, planned for an Iris Xe class laptop GPU, with the file under about 2 MB. No `ctx.filter`, `shadowBlur` or live `getImageData` at runtime; bake heavy textures in idle slices. Every animation has a static end state (`.settled * {animation:none; transition:none}`).

**The presenter toolkit** is required, and it comes from the shared modules so the controls work the same in every deck, whatever its design: `reference/deck-ui.js` (presenting), `reference/deck-editor.js` (editor), `reference/speaker-view.js` and `reference/deck-save.js`. Paste each unchanged and connect it with the adapter its header comment lists; only a deck's own extra editor controls (for example light sliders for a deck with a light image) differ. The speaker view always comes from `reference/speaker-view.js`. For the rest, if a reference deck sits in `reference/private/`, adapt its toolkit rather than rewriting it; `engine-notes.md` says where each piece lives in a deck like it. Otherwise build it to this spec.
- **Keys:**
  - → / space / clicker: builds, then slides; ← goes back;
  - a number then Enter jumps to that slide;
  - O overview, N notes, M sound, F fullscreen, B blank;
  - S speaker view in a second window (below).
- **Speaker view (S): use `reference/speaker-view.js` unchanged.** Paste the `makeSpeaker` function into the deck's script and create it once with the adapter its header comment lists (slides, current slide and build, cue words, `markCues`, voice and auto-build state, next/prev, the deck's key handler, `setNotes`, a refresh, a preferences key, and optionally a preview painter, a live-screen snapshot that keeps the Now preview current, and shared SVG defs). Call `speaker.sync()` from the deck's update, `speaker.status(bits, nx, held, hear)` from the voice renderer, and `speaker.toast()` from the deck's toast; set `speaker.voiceAt = performance.now()` while a voice result is handled (0 afterwards). Don't restyle or rewrite it: every deck gets the same speaker view. What it does:
  - a second window with the notes, a status line, a one-line "Heard:" transcript while voice listens, and Now and Next previews; a compact toolbar runs along the bottom: `n/N` (the title as its tooltip), the panel buttons, ← and →, the talk timer (click it to restart) and the clock;
  - **Notes, Now, Next** switch each panel on or off; **A− / A+** size the notes (14–48 px); the **layout button** moves the previews right, bottom, left, top or hides them; drag the bar between notes and previews (almost the whole window) or a preview's corner; **Reset sizes**; all remembered in that browser;
  - the notes are one running script that glides as the presenter moves (about 450 ms; 1.5 s when a spoken cue moved it): earlier slides grey, the current part lit with a brief gold flash, the next two lines full, then fading; laid out like printed presenter notes (a main bullet, shorter follow-ons indented, a red > on each slide title and build with [click] / [build on cue] / [builds at N s] tags, [pause] and stage directions in grey italics);
  - cues on the current slide and its builds are green (underlined once used), cues on later slides red;
  - **Edit notes** turns the current slide's script into one editable box per build: Ctrl/Cmd+Enter saves, Esc cancels, keys type rather than change slides, changing slide saves first, and the edit goes into the deck's edit state so Save writes it into the file; double-click a word to add or drop a cue.
- **Voice cues:** Web Speech advances a build when its cue word is heard. Double-clicking a word in the notes or speaker view toggles it as a cue.
- **Timing panel:** a target time for each slide, plus auto-advance from the speaking pace.
- **Editor (E):**
  - edit any text in place, and drag or resize elements; beside the size control, A− / A+ (and Alt+− / Alt+=) change the selection by 5%, and the label reads "Text size" for a single text element;
  - global and per-slide animation speed, which also scales the timers;
  - **Save uses `reference/deck-save.js` unchanged** (`makeSaver` with its adapter): the first Save asks once for the deck's own file and the deck remembers it in that browser, so every later Save, even after a reload, writes straight back; the button reads "Save", then "Save to <file>"; a **Save as…** button writes a copy without changing where Save goes; a browser that can't write files downloads a copy;
  - a working copy is kept in localStorage.
- **`window.__deck` API:** `go`, `next`, `prev`, `cur`, `step`, `busy`, `N`, `settle`, `hear`. The tests depend on it.

**File rules:**
- Name the file `<Talk title> - <World name>.html`.
- Never overwrite an existing file; a new version gets a new name. Move superseded files to the Trash only if the user asks, and never delete permanently.
- Never publish the deck as an Artifact or anywhere else. Give the local path and an `open -a "Google Chrome" "<path>"` command.

## Stage 6 · Check it like a director

Run the deck in headless Chrome with Playwright (`channel:'chrome'`, viewport 1920×1080 for frames, 1280×720 for quick checks), using the kit in `reference/tests/kit/`: copy it into the project's `tools/` and run `npm i`; its README lists each tool. Fix what you find before showing the user:
- **Errors and layout:** zero console or page errors. Every fully built slide sits inside safe margins with no overlaps or text overflow.
- **Frames:** screenshot every slide, plus 4–6 frames of each transport and signature moment. Review them as contact sheets made with `tests/kit/sheet.py`, and fix anything awkward, empty or flickering. Look at the images yourself, critically.
- **Swaps and seams:** hold the frame before and after every landing where a moving object is replaced by a copy, and compare them: no change in colour, size or angle. Look for lines in the sky and ground (`seams.js`) on every slide settled and during each arrival and camera move, at several window sizes (`aspect.js`).
- **Toolkit:** speaker view, simulated voice cues (`__deck.hear`), editor save and reload, and half and double speed. Run the kit's `hud.js`, `notes.js`, `ed.js`, `sv.js`, `save.js` and `tool.js` against the deck: the shared modules must pass them unchanged. For the speaker view (`sv.js`): every panel combination at a few window sizes, previews refit, the script gliding forward and back, the last slide, and a notes edit surviving a reload and Save.
- **Measured gates:**
  - frame pacing on every set piece (`perf.js`);
  - text contrast of at least 4.5:1 worst-decile, or 3:1 for display type of 60 px and up, judged after a projector simulation;
  - a sound walk with M on: no tonal windows, the climax loudest, nothing stacking across slides, sacred moments silent;
  - audio-picture sync at speeds 1, 0.5 and 2;
  - reduced motion;
  - the phone layout;
  - the QR decodes;
  - on-screen wording and notes unchanged from the approved storyboard.
- **Professional review:** before the first delivery, have five fresh reviewers, each in their own context and read-only, judge the frames cold against a top title-studio bar:
  - a title-sequence art director;
  - a VFX supervisor and motion designer;
  - a type director;
  - a re-recording mixer;
  - a creative director holding the goals brief.

  Each returns ranked, concrete fixes by file. Apply them, one fixer per file, then rerun every gate. One round of this does more than many rounds of self-review.
- **Goals pass:** go through the deck as the audience in the brief.
  - Does every chapter move them toward the "to"?
  - Does the memorable sentence land on screen at the right moment?
  - Is the call to action unmissable, and easy to act on from a seat?

**Clean up** after delivery, once the user has the deck:
- Report what the build left behind, with sizes (`du -sh`): check screenshots and raw frames in the scratchpad, Playwright's temporary browser profiles (`$TMPDIR/playwright_chromiumdev_profile-*`), and fixers' working copies and old source backups in the project folder.
- Keep the source parts, the test kit, the latest build and the final contact sheets (copy those into the project's `notes/`).
- Move the throwaway parts to the Trash (`/usr/bin/trash`), never `rm`. Touch only this deck's own files: never other sessions' scratch or shared temp; report those, with the command, instead.
- Tell the user how much went to the Trash, and that the space comes back when they empty it.

Then give the user:
- the open command;
- a five-line tour of what to watch for, and the keys (remind them that M turns sound on);
- what you could not test: a projector, a real microphone, the presenting laptop;
- one "even more" idea they could ask for next.

## Iterating

When the user asks for changes or "more impressive", save a **new numbered version** (World 2, World 3…) and keep the earlier ones. If they preferred something from an earlier version, bring it back rather than arguing for the new one.

For "more impressive", run the professional review again with the current version as the before-state. Have the reviewers read the previous round's findings so they don't re-raise what was fixed. Keep the source parts and test kit of each delivered version in the project folder, so the next round starts from them rather than from the built HTML.
