# APD Testing Policy

## Default testing policy

- All tests passing is mandatory
- What to test and how is defined in the Spec's Test Strategy section and AC Coverage table. If there is a project-level setting (CLAUDE.md), follow it
- Criteria for evaluating test quality:
  - Do the tests cover the acceptance criteria?
  - Are there no token tests or assertions that verify nothing?
  - Are there tests for error cases and boundary conditions?

## Quality axes that cannot be verified automatically

Quality axes the AI cannot verify automatically, such as real-device-only behavior, external service integration and subjective human evaluation, are **checked by the human at the post-completion hands-on check**. For those AC, the Build side counts implementation plus documenting "How to try it" as completion.
