# Change Proposal: ralphy-spec v2

## Summary

Transform ralphy-spec from a template-installer into a **self-correcting, self-governed execution engine** that:
1. Loads OpenSpec project specs and task graphs
2. Executes long-running agent loops via pluggable backends (Cursor/OpenCode/Claude Code)
3. Enforces budgets (money/tokens/time/iterations)
4. Validates deterministically and self-corrects based on failures
5. Persists state and produces observable progress reports

## Motivation

### Current State (v1)
- ralphy-spec is a "setup tool" that installs prompt templates
- Workflow is **human-governed**: user manually runs plan → implement → validate → archive
- No automated execution loop
- No budget enforcement or observability

### Desired State (v2)
- ralphy-spec becomes a **CLI-controlled execution engine**
- Self-correcting Ralph Loop runs autonomously until completion or budget exhaustion
- Spec-driven: tasks are defined in OpenSpec format with acceptance criteria
- Observable: ledger events, status dashboard, spend reports

## Goals

| Goal | Description |
|------|-------------|
| G1 | Load and validate OpenSpec project specs (YAML/JSON) |
| G2 | Execute tasks via pluggable backend adapters |
| G3 | Enforce hard/soft budgets at run and task level |
| G4 | Run validators and parse structured issues |
| G5 | Self-correct via repair loop when validators fail |
| G6 | Persist state to SQLite and produce reports |
| G7 | Support workspace isolation (worktrees or patches) |

## Non-Goals (v1 → v2)

- Cloud execution / distributed scheduling
- Fully accurate USD for every backend (best-effort acceptable)
- Fancy TUI (optional, CLI-first)
- Multi-agent parallel task execution (v3+)

## Constraints

- MUST maintain backward compatibility with `ralphy-spec init`
- MUST work with existing OpenSpec directory structure
- MUST support all three backends: Cursor, OpenCode, Claude Code
- SHALL NOT require external services (self-contained)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ralphy-spec CLI                            │
│  init | run | status | tail | validate | report | checkpoint    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Engine Core                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │SpecLoader│  │ TaskDAG  │  │ Loop FSM │  │ Budget   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Workspace │  │Validators│  │ Backends │  │ Ledger   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Cursor  │   │ OpenCode │   │ Claude   │
        │  CLI     │   │   CLI    │   │ Code CLI │
        └──────────┘   └──────────┘   └──────────┘
```

## Key Design Decisions

### D1: OpenSpec Format Extension
Extend OpenSpec with ralphy-spec specific fields:
- `budgets` - run/task level limits
- `backends` - backend configurations with model tiers
- `validators` - commands with parsers
- `tasks` - with file contracts, acceptance criteria, done policies

### D2: Engine State Machine
Phases: PLAN → PREP → EXEC → VALIDATE → DIAGNOSE → REPAIR → CHECKPOINT → DONE
- Each task iterates through this loop until done or budget exhausted
- Repair phase re-runs EXEC with focused "fix these issues" prompt

### D3: Workspace Isolation
Two modes:
- **Worktree mode** (recommended): git worktree per task, merge on success
- **Patch mode** (simpler): work in main repo, revert on failure

### D4: Budget Enforcement
- Hard limits: stop immediately when exceeded
- Soft limits (degrade mode): switch to cheaper model, shrink context
- Tracked: USD, tokens, wall time, iterations

### D5: Persistence
SQLite database for:
- Run/task state
- Ledger events (append-only)
- Issues with signatures for deduplication
- Checkpoints

## Migration Path

1. `ralphy-spec init` continues to work (backward compatible)
2. New `ralphy-spec run` command for engine execution
3. Existing `.ralphy/config.json` extended with v2 fields
4. New `openspec/project.yml` for spec-driven projects

## Success Criteria

A run is considered successful when:
- All tasks reach DONE state
- For each task:
  - Required validators pass
  - File contract respected
  - Checkpoint produced
- Report generated with progress + spend summary

## References

- [Ralph Wiggum methodology](https://ghuntley.com/ralph)
- [opencode-ralph-wiggum](https://github.com/Th0rgal/opencode-ralph-wiggum)
- PRD: ralphy-spec Full Specification v2
