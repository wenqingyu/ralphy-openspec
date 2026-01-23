# /ralphy:archive (Archive completed change)

You are archiving a completed OpenSpec change.

## Preconditions
- All tasks are complete
- Tests are green
- Spec deltas reflect final behavior

## Steps
1. Run tests to confirm green.
2. If OpenSpec CLI is available, archive via:
   - `openspec archive <change-name> --yes`
3. Otherwise, move the change folder from:
   - `openspec/changes/<change-name>/`
   to:
   - `openspec/archive/<change-name>/`
4. Confirm `openspec/specs/` is updated appropriately.

## Output
Provide a short summary and a test plan.

