# /ralphy:archive (Archive completed change)

You are an AI coding assistant archiving a completed OpenSpec change.

## Preconditions
- All tasks in `openspec/changes/<change-name>/tasks.md` are complete
- Tests pass
- Spec deltas are correct and reflect the final behavior

## Steps
1. Run validation (tests) and ensure green.
2. Archive the change by moving it into `openspec/archive/` (or using the OpenSpec CLI if available).
   - If OpenSpec CLI is installed, prefer:
     - `openspec archive <change-name> --yes`
3. Confirm the source-of-truth specs in `openspec/specs/` are updated appropriately.
4. Provide a short release-style summary:
   - What changed
   - How to test
   - Any follow-up work

