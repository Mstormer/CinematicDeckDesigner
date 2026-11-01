# Cinematic Deck Designer

A Claude Code skill that turns a talk manuscript or outline into a one-of-a-kind cinematic HTML presentation.

It walks you through your goals and a few questions, then pitches three custom design worlds. It storyboards every slide, builds one offline HTML file, and checks it frame by frame.

Every deck comes with:
- 3D transitions that carry the talk's logic;
- a unique visual for each slide;
- synthesized sound;
- speaker view, voice cues and timing;
- an in-page editor that saves into the file.

## Install

```bash
git clone https://github.com/Mstormer/CinematicDeckDesigner.git
ln -s "$PWD/CinematicDeckDesigner/cinematic-deck-designer" ~/.claude/skills/cinematic-deck-designer
```

## Requirements

- **Free disk space: about 25 GB** while a deck is being built and checked. Check rounds write thousands of screenshots and frames (one deck reached 20 GB). The skill warns you at the start if less than 10 GB is free, keeps check rounds lean, and moves the throwaway files to the Trash when the deck is done, so the space comes back once you empty it. The finished deck itself is one HTML file of about 1 MB.
- Google Chrome, plus Node.js for the check kit (Playwright).

## Use

In Claude Code, type `/cinematic-deck-designer` and attach your manuscript or outline. You can also just ask for an impressive custom presentation.

## Contents

- `cinematic-deck-designer/SKILL.md`: the workflow, from getting the talk and setting goals through world pitches, storyboard, build and checks.
- `cinematic-deck-designer/reference/`:
  - `engine-notes.md`: build rules learned the hard way;
  - `speaker-view.js`: the speaker view module every deck uses unchanged;
  - `tests/kit/`: the Playwright check kit (layout, motion frames, seams, window sizes, frame pacing, sound walk, audio-picture sync, presenter toolkit, speaker view, phone, reduced motion, contrast, projector simulation, QR, wording). Copy it into your project's `tools/` and run `npm i`.
  - `private/` (optional, never committed): your own reference deck and quality bar, if you keep one.
- `Presentation Design Workflow.md`: the same workflow as a paste-in prompt, for use without installing the skill.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md). You may use, copy and change this skill for any noncommercial purpose: personal use, study, research, hobby projects, and use by charities, schools, churches and other noncommercial organizations. Commercial use, including selling the skill or a changed version of it, needs a separate license from the author. This is source-available software, not open source.

Required Notice: Copyright (c) 2026 Mstormer (https://github.com/Mstormer)
