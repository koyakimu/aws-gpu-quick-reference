# APD Core Principles

## Principles

- **Separate human time from AI time.** Intent/Spec/Plan are human time (interactive); Build is AI time (autonomous execution)
- **Do not write code before the design is approved.** For any request to build or change something, first decide the classification (Design / Spec / Plan / No design) (`02-cycle-flow.md`)
- **Zero human intervention during the AI phase.** Once the human approves the design, they step away. On approval, Build runs to completion right there in auto mode. `/goal` may be used for long unattended runs (`01-phases.md`)
- **Keep editing each document as a single living document.** Do not pile up diffs in separate files. git holds the authoritative history
- **The human review surface is the PRs and issues** (e.g. on GitHub). `docs/apd/` is working material for the AI, not a place the human scans day to day
- **When unsure, do not decide on your own; ask the leader agent (AI).** This is not a query to the human (do not query the human during Build). Asking too much is safer than running out of control
- **Stay a thin convention layer.** APD provides only the Design / Spec / Plan / Decision conventions and a minimal set of skills. Loops, parallelization, task management and GitHub integration are delegated to Claude Code's built-in features (`/goal`, subagents, agent teams, dynamic workflows, hooks, the Task tool)
- **APD does not rewrite the user's CLAUDE.md.** APD's conventions live in `.claude/rules/apd/` (auto-loaded). Do not write usage declarations such as "developed with APD" or version numbers into CLAUDE.md (they go stale and create double maintenance). CLAUDE.md holds only project-specific matters

## Language

- **Converse in the language the user is writing in.** If the user switches language, follow the latest one
- **Write APD documents in that same language**: `docs/apd/` files (Design, Spec, decisions, todo), Plans, PR descriptions (including "How to try it") and issues. When using the templates in `${CLAUDE_PLUGIN_ROOT}/templates/`, keep the section names as they are (`## User Story`, `## Acceptance Criteria`, `### AC Coverage`, `## Who` etc.; skills refer to them by name), along with the section structure, IDs (AC-001, D-001 etc.) and frontmatter keys and structural values (`spec_id`, `version`, `status`, `decision_refs` etc.). Write everything else in the user's language: body text, placeholder text, free-text frontmatter values such as `title`, and the descriptive part of a heading after its section name (e.g. `## Who: ...`)
- When editing an existing file outside `docs/apd/`, such as the project's CLAUDE.md, write in the language that file is already written in
- The plugin's own rules, skills and templates are written in English. That is not a reason to answer or write in English

## Decision priority (during Build)

1. **Stated in CLAUDE.md** → follow it
2. **Not stated in CLAUDE.md** → ask the leader agent for a decision
3. **The leader agent cannot decide** → raise it in the Spec up front, or confirm with the human at the post-completion hands-on check and fix the Spec in the next cycle

Promote frequent decisions into CLAUDE.md to widen the scope of autonomy.
