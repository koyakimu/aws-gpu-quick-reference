# APD Document Management

## Living documents + git as the authoritative history

- Once a document is created, **keep editing it in the same place**. Do not pile up diffs in separate files (Amendment / Patch)
- For "what it used to be", **git log / git blame** is the authoritative history
- AI work record: Git commit log + PR history
- Human decision record: `decisions.md` (a single append-only log)

Constantly moving and adding files leads to missed moves and inconsistencies. Design so that **moving files is not assumed**.

## Document tree (3 file types)

```
docs/apd/
├── design.md            ← north star (keep editing; rarely changes)
├── decisions.md         ← append-only decision log (single file)
└── spec-{feature}.md    ← one per feature (keep editing)
```

- Do not create subdirectories
- Files are added **only when building a new feature** (an essential increase, so acceptable)
- When a feature is removed, remove that feature's Spec too (this is the only "deletion")
- Add `docs/apd/preview-{feature}/` only when creating deliverable previews (optional; see `05-deliverable-preview.md`)
- Add `docs/apd/cross-context-scenarios.md` only when data flow between contexts is complex (optional; name it differently from `spec-*.md` so it is not confused with Specs that are build targets)

### Naming guidelines

- `{feature}` in `spec-{feature}.md` is the issue number (or ID) in the project's issue tracker if there is one, otherwise a short slug
- The Spec ID is defined separately in the frontmatter (`spec_id: "AUTH-042"` etc.)

## Human review surface = PRs and issues

The specs in `docs/apd/` are **working material for the AI**. The human is not expected to scan them day to day. What the human looks at:

| What they want to know | Where to look |
|------------|---------|
| In progress / backlog | The project's issue tracker (e.g. `gh issue list`; updated automatically, no sync needed), or `docs/apd/todo.md` when there is none |
| Accept an individual change | The "How to try it" section of that PR (post-completion hands-on check) |
| Overall product picture | `docs/apd/design.md` |

Do not place a "human dashboard (INDEX etc.)" in `docs/apd/`. It adds things to keep in sync, a risk of the same kind as missed moves. Use the PRs and the issue tracker as the human dashboard.

## Backlog (issue tracker)

- If the project has an issue tracker, use it as the backlog. Decide which one in this order: (1) what the project's CLAUDE.md states, (2) what the user says, (3) GitHub issues, if the `origin` remote is on GitHub and the `gh` command is installed. Other trackers (GitLab, Linear, Jira, etc.) are used through whatever tool or connector is available
- If there is none, use `docs/apd/todo.md` (append-only)
- Do not read credentials or tokens to decide. If a tracker command fails (e.g. not signed in), tell the user and append to `docs/apd/todo.md` instead
- Where the tracker supports labels, classify items with `apd:todo` / `apd:scope-out`

## Spec format

Markdown with YAML frontmatter; the canonical format is `${CLAUDE_PLUGIN_ROOT}/templates/spec.md` (used by `apd:spec`). Frontmatter: `spec_id`, `context`, `version`, `issue_ref`, `title`, `decision_refs`. Sections: User Story / Acceptance Criteria (AC-001… in Given/When/Then; measurable non-functional ones as AC-NFR-xxx) / UI Description / Context Boundary / Test Strategy (AC Coverage table) / Deliverable Previews / Delegated Non-Functional Requirements / Notes.

### Updating a Spec

For bug fixes and spec changes, **edit the existing Spec directly**:

1. Fix or add the relevant AC
2. Bump `version` in the frontmatter
3. Write the reason for the change in the git commit message (do not leave diffs in a separate file)

## decisions.md format

Append technical choices and design decisions to the single `docs/apd/decisions.md` (starting with a `# Decisions` heading), newest on top, in the `${CLAUDE_PLUGIN_ROOT}/templates/decision.md` format: `## D-{NNN}: {title}` with Date / Context / Options (proposed by the AI) / AI Recommendation / Decision and Reason (filled in by the user) / Refs. To reference a decision from a Spec, use an anchor such as `decisions.md#d-001`.
