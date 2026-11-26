# APD Git Strategy

## Branch strategy

Work on each cycle in a dedicated branch. One of the following names is recommended:

- With an issue: `feat/{issue#}-{slug}` / `fix/{issue#}-{slug}` / `chore/{slug}`
- Without an issue: `{type}/{slug}` (type is feat / fix / chore / refactor etc.)

Create it from `main` and merge via a PR when the cycle is complete.

## Parallel execution and worktrees

When running multiple tasks in parallel in the Build phase, use git worktrees. Claude Code subagents can be launched with file isolation via `isolation: "worktree"`, so APD has no worktree management scripts of its own.

For small cycles that do not need parallelization, you may work directly on the branch without creating a worktree.

## Commit conventions

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:` etc.)
- Include the related Spec ID / issue number in the body or footer (e.g. `Refs: spec-42 / Closes: #42`)
- 1 task = 1 or more commits (commit in meaningful units)
