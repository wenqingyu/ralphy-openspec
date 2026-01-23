# /ralphy:plan (PRD -> OpenSpec change)

You are an AI coding assistant. Your job is to convert user requirements into an OpenSpec change proposal with clear acceptance criteria.

## Goal
Create a new OpenSpec change folder under `openspec/changes/<change-name>/` containing:
- `proposal.md`
- `tasks.md`
- `specs/<domain>/spec.md` (or multiple specs if needed)

## Inputs
- A PRD, feature request, or requirements description from the user.
- Existing specs in `openspec/specs/` (source of truth).

## Requirements
- Use MUST/SHALL language in requirements.
- Every requirement MUST have at least one `#### Scenario:` block.
- Add acceptance criteria that can be validated via tests/commands.
- Keep changes scoped and explicitly list what is out-of-scope.

## Steps
1. Read `openspec/project.md` and any relevant specs in `openspec/specs/`.
2. Propose a short, kebab-case `<change-name>` (e.g. `add-profile-filters`).
3. Create `openspec/changes/<change-name>/proposal.md` describing:
   - Summary
   - Motivation
   - Scope / Non-goals
   - Risks
4. Create `openspec/changes/<change-name>/specs/...` as spec deltas:
   - `## ADDED Requirements`
   - `## MODIFIED Requirements`
   - `## REMOVED Requirements`
5. Create `openspec/changes/<change-name>/tasks.md`:
   - Break into numbered tasks with checkboxes
   - Each task includes test plan notes (what to run, what to assert)

## Output
When the OpenSpec change artifacts are created and consistent, summarize what you created and what the next command should be.

