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

## Use

In Claude Code, type `/cinematic-deck-designer` and attach your manuscript or outline. You can also just ask for an impressive custom presentation.

## Contents

- `cinematic-deck-designer/SKILL.md`: the workflow, from getting the talk and setting goals through world pitches, storyboard, build and checks.
- `cinematic-deck-designer/reference/`:
  - `engine-notes.md`: build rules learned the hard way;
  - `tests/kit/`: the Playwright check kit (layout, motion frames, seams, window sizes, frame pacing, sound walk, audio-picture sync, presenter toolkit, phone, reduced motion, contrast, projector simulation, QR, wording). Copy it into your project's `tools/` and run `npm i`.
  - `private/` (optional, never committed): your own reference deck and quality bar, if you keep one.
- `Presentation Design Workflow.md`: the same workflow as a paste-in prompt, for use without installing the skill.
