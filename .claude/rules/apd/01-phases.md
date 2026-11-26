# APD Phase Definitions

## Phases

```
Intent ── human + AI dialogue
  Deliverable: Design (north star)

Spec ── AI drafts + human reviews
  Deliverable: Spec (AC + verification approach + deliverable preview description) + Decision Records

Plan ── AI drafts + human reviews (changes that do not get a Spec)
  Deliverable: a design kept in the conversation and the PR body (goal, approach, alternatives, verification method)

Build ── AI autonomous (runs autonomously to completion; does not stop midway during implementation)
  Deliverable: implementation + all tests passing + PR (with how-to-try written)
  → On approval, implement right there in auto mode (`/goal` for long unattended runs). See "Build does not stop midway"

Post-completion hands-on check ── human
  The human tries it on a real device following the PR's "How to try it" and makes the acceptance decision
  If there are discrepancies, do not send it back; move to the next cycle (fix Spec → Build)
```

## Where the human is involved
- **Intent**: decide the intent
- **Spec / Plan**: review and approve the design
- **Post-completion hands-on check**: confirm the working deliverable matches the intent

## Build convergence

Build convergence is judged by the build AI itself against the completion condition that `/apd:go` assembles (the Spec's AC, tests passing, Handoff written in the PR); it surfaces the results and fixes any gaps autonomously. When building with `/goal`, the evaluator judges whether the same condition is met at the end of each turn. The following notes apply mainly when using `/goal`:

- **The evaluator does not call tools.** Claude must surface test run logs, the PR diff and the implementation into the conversation within the turn
- **Turns with background work are skipped for evaluation.** If a turn ends while a subagent or background shell is still running, that turn is not evaluated; the judgement happens at the end of the next turn with no background work. In a parallelized Build, convergence may appear delayed, but this is not abnormal
- If it loops on the same issue, stop at the limit stated in the condition (number of turns or time) and report
- For AC the AI cannot verify automatically (real-device only, subjective human evaluation, etc.), the implementation plus documenting "How to try it" counts as completion on the Build side (the actual judgement is left to the post-completion hands-on check)

## Build does not stop midway

Do not escalate during implementation. When a decision not covered by the Spec is needed, such as a new business rule or a change to an external interface, either **raise it in the Spec up front** (confirmed by the human in the Spec phase) or **notice it at the post-completion hands-on check and fix the Spec in the next cycle**.

**Build runs in auto mode (convention).** In manual mode, every unpermitted tool call requires human confirmation, so "Build does not stop midway" cannot hold. `/goal` also automates only turn continuation; permission for tool calls remains the job of the permission mode. Switch to auto mode with Shift+Tab, `--permission-mode auto` at startup, or `permissions.defaultMode` in user settings. It cannot be forced from project settings or plugins, so when `/apd:go` uses `/goal`, prompt the user to check right before pasting it.

Even in auto mode, some stops remain: after the classifier blocks 3 times in a row or 20 times in total it falls back to normal prompts, operations matching `permissions.ask` always require confirmation, and the first read outside the working directory requires confirmation. Treat these as expected stops and do not try to work around them in the condition. In environments where auto mode is unavailable (disabled by organization settings, model requirements not met), the human stays alongside on the assumption that Build will stop at permission prompts.

## Parallel execution

To run multiple tasks in parallel, use the following Claude Code features:
- **subagent**: delegate side tasks within a single session (file isolation possible with `isolation: "worktree"`)
- **agent teams** (experimental): a leader + teammates coordinating multiple sessions. Disabled by default; requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The shared task list is used only in sessions that have the Task tool; otherwise they coordinate via messages. Teammates' permission prompts appear in the leader session, so this fits poorly with the Build phase's "does not stop midway" premise
- **dynamic workflows**: large fan-out where a JavaScript script holds the plan. Suited to audits, bulk migrations and cross-verification. Up to 1,000 agents per run with at most 16 running concurrently, and no user input is accepted mid-run (only agents' permission prompts can stop a run). At launch, manual / accept edits mode shows an approval prompt every time (auto mode only the first time)
- **`/batch`**: splits a large change across 5–30 worktree-isolated subagents, each of which implements, runs tests and creates a PR (requires a git repository; stops once after decomposition to ask for approval of the plan)

APD does not force any of these choices. The leader decides based on the size of the Build.
