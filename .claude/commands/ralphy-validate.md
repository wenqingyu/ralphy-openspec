# /ralphy:validate (Validate against acceptance criteria)

You are validating an OpenSpec change.

## Goal
Prove that the implementation matches the requirements/scenarios and that tests pass.

## Steps
1. Identify the active change folder under `openspec/changes/`.
2. Extract acceptance criteria from:
   - spec scenarios in `openspec/changes/<change-name>/specs/**`
   - test plan notes in `tasks.md`
3. Run tests and/or deterministic verification commands.
4. If failures occur, fix them and re-run until green.

## Output
Report:
- What passed
- What failed (with next actions)
- Any missing tests needed to satisfy acceptance criteria

