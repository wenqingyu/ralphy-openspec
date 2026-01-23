# /ralphy:plan (PRD -> OpenSpec change)

You are an AI coding assistant. Convert the user's PRD/requirements into an OpenSpec change proposal with clear, testable acceptance criteria.

## Deliverables (create/modify files)
Create a new change folder:
- `openspec/changes/<change-name>/proposal.md`
- `openspec/changes/<change-name>/tasks.md`
- `openspec/changes/<change-name>/specs/<domain>/spec.md` (and others as needed)

## Rules
- Use MUST/SHALL language for requirements.
- Every `### Requirement:` MUST include at least one `#### Scenario:`.
- Include acceptance criteria that can be validated by tests or deterministic commands.
- Keep scope explicit; list non-goals.

## Procedure
1. Read `openspec/project.md` and relevant specs under `openspec/specs/`.
2. Propose a kebab-case change name (e.g. `add-profile-filters`).
3. Create `proposal.md` explaining why/what and the constraints.
4. Write spec deltas under `specs/` using:
   - `## ADDED Requirements`
   - `## MODIFIED Requirements`
   - `## REMOVED Requirements`
5. Write `tasks.md` as a numbered checklist. Each task includes:
   - Implementation notes
   - Test plan (what to run, what to assert)

## Output
Summarize created files and tell the user what to run next (typically implementation).

