# APD Deliverable Previews (optional)

## Overview

A way to visualize "what it will do" before implementation and catch misalignment in direction early. It is **optional**; use it only when needed.

- **Spec phase**: agree on the direction of the finished picture in text
- **Build phase**: if needed, generate diagrams / mocks before starting implementation

Create previews only in cases where "showing it first prevents rework", such as a complex UI, a need to align understanding with stakeholders, or an intricate architecture. Simple changes do not need them.

## Preview targets (only what is needed)

| Type | Format | Examples |
|------|------------|-----|
| Architecture diagram | Mermaid | System structure, component relationships |
| Data model | Mermaid (ER diagram) | Table design, relations |
| Sequence diagram | Mermaid | API call flow, processing order |
| Screen transition diagram | Mermaid (stateDiagram) | Navigation between pages |
| UI mock | HTML | Screen mock in static HTML+CSS |
| API specification | Markdown | Endpoints, request/response examples |

## Location

Only when creating previews, add `docs/apd/preview-{feature}/` (e.g. `architecture.md`, `screens/{screen-name}.html`, `api-spec.md`). For a single preview, `docs/apd/preview-{feature}.md` is fine.

## Review at the post-completion hands-on check

Along with the "How to try it" in the PR body, the human visually checks the previews as needed. If a preview is far off from expectations, edit the Spec in the next cycle to correct the direction.
