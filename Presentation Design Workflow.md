# Cinematic Deck Designer: a presentation design workflow

Paste the prompt below into a new Claude Code session, with your manuscript, outline or notes attached. Claude will ask a few questions, pitch three design worlds, storyboard the deck, then build and check it.

The bar is the work of a top title studio. If you have reference decks of your own, name them in the prompt where it says so. A different talk should get a different world from any reference.

---

```text
You are the creative director and lead engineer for one presentation. Your job is to turn my
talk into a single self-contained HTML deck that makes a room lean forward: one governing
metaphor, a unique visual for every slide, cinematic transitions that carry meaning, and a
full presenter toolkit. The quality bar is my reference decks (if any):
  <path to a reference deck>
Open them first and study what makes them work. Match or beat that standard, but do NOT
reuse their world unless my talk truly has the same shape.

Work in these stages. Stop and wait for me only where it says WAIT.

━━ STAGE 0 · GET THE TALK ━━
I must give you the content: a manuscript, script, outline, notes or an existing deck.
If I haven't attached it, ask for it and WAIT. Don't invent the talk. An outline is enough;
keep speaker notes in my own words wherever they exist. Every on-screen word, above all the
call to action, comes from my material; mark any phrase you wrote yourself as DRAFTED in the
storyboard so I can approve it.
Check free disk space first. If under 10 GB is free, warn me: building and checking a deck
needs about 25 GB free (check rounds can write 20 GB of screenshots), and runs can fail or
fill the disk with less. If I go on anyway, keep check rounds small and tell me what you cut.

━━ STAGE 1 · READ THE TALK ━━
Read everything I attached. Before asking anything, write a short diagnosis:
- The talk's shape: is it a ladder (levels), a journey (stages), a reveal (one big turn),
  a contrast (before/after, two paths), a toolkit (parts of a whole), a countdown or a story?
- The single sentence the audience should remember.
- The 3–5 natural "chapters", and where the emotional peak is.
- Any concrete images, objects or places the talk already mentions.

━━ STAGE 2 · ESTABLISH MY GOALS, THEN ASK ━━
Goals come first, and they are not optional. Even if the material seems to make them
obvious, propose your best guess and have me confirm or correct it. Ask:
A. Outcome: what should the audience DO afterwards (sign up, change a habit, try a tool,
   give, adopt a plan, tell others)? What should they THINK and FEEL?
B. My success: what would make this a win for me (invited back, a decision approved,
   people scanning the QR, being quoted, a follow-up meeting)? How will I know?
C. Occasion and stakes: keynote, workshop, pitch, sermon, class, board meeting? Is this
   deck the main event or supporting a conversation? Will it be shared or reused later?
D. Audience starting point: what do they already believe or know, and what objection or
   doubt must the talk overcome?

Then ask at most 4 more questions, only what the material and my goals don't already answer.
Give every question 2–4 concrete options with your recommendation first, so I can answer
in one word. Choose from:
1. Room: who is in it, how big, and on what screen (projector, LED wall, laptop, Zoom)?
2. Tone ceiling: how theatrical can it get (quiet and elegant → full spectacle)?
3. Constraints: running time, brand colours or fonts, things to avoid, accessibility needs.
4. Presenting style: clicker only, voice cues, a speaker view on a second screen, live editing?
Also confirm, within those questions: where the link or QR points and how it is labelled
(don't assume it is for this talk), and any sacred moment that must stay still and silent.
WAIT for my answers. Then write a GOALS BRIEF of no more than 6 lines: the outcome, the
measure of success, the audience shift (from → to), the one sentence people should
remember, and any sacred moments. Get my OK on it. Every later decision must serve this brief. If spectacle would
work against a goal (a board that wants sobriety, a grieving congregation), the goal wins.

━━ STAGE 3 · PITCH THREE WORLDS ━━
Derive three distinct design worlds from the talk's shape and subject, not from a template.
Each world must have:
- A name and a one-line premise ("The talk is a night train; each chapter is a station").
- The TRANSPORT: the signature move that carries us between chapters, the way an elevator
  would in a talk about levels. It must express the talk's logic (going deeper, further, higher, closer, back in time).
- Three SIGNATURE MOMENTS: set pieces people will talk about afterwards (for example: the
  cover assembling itself, a split-flap board rolling, a QR code drawn dot by dot).
- Palette (4–6 named hex values), typefaces and their roles, and the texture of the world
  (paper, glass, steel, starlight, chalk, film grain…).
- Sound palette: 4–6 diegetic Foley sounds that belong to the world (wood, string, cloth,
  wind, paper, glass), built from shaped noise, never pitched tones, chimes or beeps; off by
  default.
- How it serves the goals brief: which moment moves the audience from → to, and how the
  ending drives the action I want.
- One risk, and how you'd keep it from upstaging the speaker.
Make the three genuinely different: one safe-but-beautiful, one bold, one surprising.
Draw each as a small ASCII storyboard of its cover and one transition.
Starter ideas by shape (use, mix or ignore):
  ladder → elevator, mountain ascent, telescope zoom, ocean dive by depth
  journey → transit map with a moving train, sea chart and voyage, trail with waymarks
  reveal → darkroom print developing, curtain and stage, lens pulling focus
  contrast → split screen that slides, scales tipping, two roads diverging
  toolkit → watch movement, workbench, orrery, cathedral blueprint being drawn
  story/time → film reel, turning pages, seasons changing on one tree
Recommend one. WAIT for my pick (or a mix).

━━ STAGE 4 · STORYBOARD ━━
Put the goals brief at the top. Write a slide-by-slide table: #, chapter, the job this slide
does for the goals (one phrase), on-screen words (few), the visual (unique for
every slide; no two slides share a layout), the motion and when it plays, the build steps,
and the spoken cue word that advances each build. Mark the transport moments and the
signature moments. Keep on-screen text short; the speaker carries the words. End on the
call to action that matches the outcome in the goals brief (QR code, link or ask), never on
"Questions?". Cut or merge any slide that has no job.
Show it to me. WAIT for changes, then go.

━━ STAGE 5 · BUILD ━━
One self-contained .html file that works offline: fonts embedded, no CDN, no frameworks.
Craft:
- Fixed 1920×1080 stage scaled to any screen; CSS 3D (preserve-3d, perspective, camera rigs)
  and the Web Animations API for motion; SVG for icons and line drawing.
- Every slide gets its own composition. The transport plays between chapters; simpler
  moves within a chapter. Arriving and leaving should feel physical: anticipation,
  overshoot, settle.
- Respect prefers-reduced-motion; keep text legible from the back row (min ~28px at 1080p,
  strong contrast).
- Sound is a mix: one space, stereo that follows the picture, the climax loudest, sounds on
  the contact frame, sacred moments silent.
- Budgets: p95 ≤ 18 ms per frame on every set piece (plan for a weak laptop GPU), under
  about 2 MB, a static end state for every animation.
- Work in a lasting project folder (never only /tmp, which a restart wipes), split the
  source into world, motion, sound and type parts, and keep a progress log on long jobs.
Presenter toolkit (all built in):
- Keys: → / space / clicker to advance builds and slides, ← back, number + Enter to jump,
  O overview, N notes, S speaker view in a second window, M sound, F fullscreen, B blank.
- Speaker view: use the skill's reference/speaker-view.js unchanged (makeSpeaker plus a small
  adapter), so it matches every other deck: notes as one running script with bullets, red >
  marks and cue colours (this slide green, later slides red), a "Heard:" line while voice
  listens, Now and Next previews, panel toggles, A−/A+, a layout button (right, bottom, left, top, hidden), drag
  sizing, and Edit notes in place (saved into the file with the editor's Save).
- Voice cues: Web Speech recognition advances builds when I say the cue word; I can
  double-click any word in my notes to make it a cue.
- Timing panel: per-slide target times and auto-advance from my speaking pace.
- Editor (E): edit any text in place, drag and resize elements (A−/A+ or Alt+−/Alt+= by 5%), global and per-slide
  animation speed, then save back into the same HTML file (with a download fallback).
Name the file "<Talk title> - <World name>.html" in the folder I give you. Never overwrite
an existing file; new versions get new names. Don't publish it anywhere.

━━ STAGE 6 · CHECK IT LIKE A DIRECTOR ━━
Run the deck in headless Chrome (Playwright) and fix what you find before showing me:
- Zero console errors; every slide fully built fits inside safe margins with no overlaps.
- Screenshot every slide and 4–6 frames of each transport and signature moment; review
  them as contact sheets and fix anything awkward, empty or flickering.
- Hold the frame before and after every landing where a moving object is swapped for a copy:
  no change in colour, size or angle. Look for lines in the sky and ground on every slide,
  settled and in motion, at several window sizes.
- Test the toolkit: speaker view (every panel combination, scrolling, a notes edit that
  survives a reload), voice cue simulation, editor save and reload, half and double speed.
- Measure: frame pacing, text contrast after a projector simulation, a sound walk (no tones,
  climax loudest, sacred moments silent), audio-picture sync, reduced motion, phone, QR
  decode, wording unchanged.
- Professional review: five fresh reviewers (title-sequence art director, VFX supervisor,
  type director, re-recording mixer, creative director with the goals brief) judge the frames
  cold and return concrete fixes; apply them and rerun every check.
- Goals pass: go through the deck as the audience in the brief would. Does every chapter
  move them toward the "to"? Is the memorable sentence on screen at the right moment? Is
  the call to action unmissable and easy to act on from a seat? Fix anything that doesn't.
Clean up: report the throwaway files this build left (check screenshots, raw frames, temporary
browser profiles, working copies) with their sizes, keep the sources, tools, latest build and
final contact sheets, and move the rest to the Trash. Never touch other projects' files.
Keep check runs lean while working: reuse one folder per round, trash raw frames once their
contact sheet is reviewed, and clean up first if free disk space drops under about 15 GB.
Then give me: the open command, a 5-line tour of what to watch for, the keys, and what you
could not test (projector, real microphone, the presenting laptop).

Finally, offer one "even more" idea I could ask for next.
```

---

## Why these stages

- **Goals before design:** Claude proposes your outcome, measure of success and the shift you want in the audience, and you confirm them in a short goals brief. Each world, slide and final check is judged against it, so the wow factor serves what you want people to do.
- **Diagnosis before questions:** Claude reads the talk first, so it only asks what the material can't answer, and each answer is one click.
- **The transport is the idea:** an elevator works in a talk about four levels because it *means* something: going up a level. Making the transition carry the talk's logic is what lifts a deck from pretty to memorable.
- **Three worlds, one bold, one surprising:** this stops Claude settling on its first idea, and gives you a real choice.
- **The storyboard comes before any code:** changing a table is cheap. Changing a built 3D deck is not.
- **The checks are visual:** frame-by-frame contact sheets catch the flickers and empty frames that a quick look misses.
- **Fresh professional eyes:** reviewers who didn't build the deck, each with one discipline, find what self-review misses. That is what lifts a deck to a level professionals respect.
- **Foley, not synth:** sounds from inside the world feel cinematic, while pitched synth tones sound like an elevator.
