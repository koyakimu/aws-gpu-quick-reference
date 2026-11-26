# APD Unified Cycle Flow

## Unified cycle flow

Treat every change uniformly as a "cycle". When you receive a request to build or change something, decide the classification before writing code and declare it in one line. If the user specifies a classification, follow it.

| Trigger | Classification | Flow |
|---------|------|--------|
| New product / major change of direction | Design | Intent (Design) → Spec → approval → Build → post-completion hands-on check |
| New feature | Spec | Spec (references existing Design, new spec file) → approval → Build → post-completion hands-on check |
| Spec change / bug caused by the Spec | Spec | Edit the existing Spec (bump version) → approval → Build → post-completion hands-on check |
| Changes that do not change behavior, or are not big enough for a Spec (refactoring, internal technical changes, dev foundation / infra / configuration, scripts, multi-file fixes) | Plan | Present the Plan in the conversation → approval → Build (append technical decisions to `decisions.md`) → post-completion hands-on check |
| Typos, config value changes, few-line fixes, bug fixes where the cause and the fix are unambiguous | No design | Build |

For Design / Spec / Plan, do not write code until approval is given. After approval, Build does not stop midway. Requests that build nothing, such as chat, investigation or answering questions, are not cycles.

In projects with an issue tracker (GitHub issues etc.; `03-documents.md` › Backlog), the baseline is **1 issue = 1 cycle**. Cross-linking the issue number with the Spec / PR leaves a trail of the cycle automatically. In projects without one, represent cycles with the files in `docs/apd/` and the git history.

## Bug triage

When a bug report or test failure comes in, the AI first determines the cause:

- **Caused by the Spec** (missing or ambiguous specification) → noticed at the post-completion hands-on check; fix the Spec in the next cycle and bump the version
- **Caused by Build** (implementation does not match the Spec) → the build AI detects it in Build's Spec check (completion condition) and fixes it autonomously
