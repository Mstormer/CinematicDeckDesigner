# AGENTS.md: rules for working on this repo

- The skill lives in `cinematic-deck-designer/`. `~/.claude/skills/cinematic-deck-designer` is a symlink to it, so edits here are live.
- Keep `SKILL.md` and `Presentation Design Workflow.md` in step. A change to the stages goes in both.
- New hard-won build lessons go in `cinematic-deck-designer/reference/engine-notes.md`.
- No built decks, test screenshots, `node_modules`, `vendor/` or zips in the repo.
- Commit and push only when the user asks. Author commits as `Mstormer <10608999+Mstormer@users.noreply.github.com>`, with no co-author or Claude attribution trailers.
- Never delete permanently. Move files to the Trash.
- Keep the repo anonymous: no owner name, personal paths, domains, or talk content (titles, verses, speaker notes). The owner's reference decks and quality bar live in the untracked `cinematic-deck-designer/reference/private/`; never commit it.
