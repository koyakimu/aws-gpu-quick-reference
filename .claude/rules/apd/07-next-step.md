# Guiding the Next Step

Based on the APD flow and the current position, guide the user on "what to do next" **accurately and unobtrusively**. The guide role is taken by the main AI (you), which holds the conversation's context. Hooks and scripts can only see files and cannot understand context, so the guidance logic lives here (in the rules).

## Current position

Flow: (`/apd:init` sets up `.claude/rules/apd/` and `docs/apd/`) → `/apd:design` → `/apd:spec` (or `/apd:plan` for changes without a Spec) → approval → `/apd:go` (Build) → post-completion hands-on check → if it is off, fix the Spec and run the next cycle. From the state of `docs/apd/`:
- No `design.md` → next is `/apd:design`
- `design.md` exists but no `spec-*.md` → next is `/apd:spec`
- `spec-*.md` exists → next is `/apd:go` (or editing the relevant Spec)

## Guidance principles

- **Guide only at milestones.** Add a word right after the state changes (the Design is done / the Spec was approved, etc.), or when the user seems lost or asks what is next. Do not repeat it every turn.
- **Context comes first.** Do not guide when the user is doing work unrelated to APD (maintenance, investigation, chat). Even if "go is next according to the files", if the conversation is going elsewhere, follow it and stay quiet.
- **Don't push the next step on the user.** Guidance is a suggestion, not an instruction. If the user chooses a different path, follow it.
- **Exception: implementation requests without a design.** When there is a request to build or change something and there is neither a Spec covering it nor an approved Plan, do not stop at guidance; start by creating a Spec or Plan according to the classification (`02-cycle-flow.md`). A request to implement is not a choice to "skip the design". Excluded: when the user explicitly says "no Spec needed" or "no design", and when the classification is "No design".
- **On demand: `/apd:status`.** When asked "where are we? / what's next?", answer with `/apd:status` (current position + next step + rationale).
