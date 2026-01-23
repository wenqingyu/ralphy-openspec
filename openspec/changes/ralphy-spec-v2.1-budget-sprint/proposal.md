# Change Proposal: ralphy-spec v2.1 — Budget Intelligence + Sprint Semantics

**Depends on:** `ralphy-spec-v2`  
**Type:** Enhancement

## Summary

Upgrade ralphy-spec v2 with:
1. **Three-tier budget model** (Optimal → Warning → Hard) instead of hard caps only
2. **Sprint-based task semantics** (XS/S/M/L/XL sizing with default budgets)
3. **Artifact-first collaboration** (STATUS.md, TASKS.md, BUDGET.md as first-class contracts)
4. **Folder rename** from `.ralphy/` to `ralphy-spec/` (matches CLI name)

## Motivation

### Problem with Hard Caps Only
- Hard caps cause premature failure on tasks that just need a bit more budget
- Unlimited loops cause context bloat and hallucination
- No visibility into "healthy" vs "concerning" spend

### Solution: Optimal Range + Pressure Model
- Let the agent comfortably finish most tasks within **optimal** range
- Apply **behavioral pressure** (context shrink, repair-only mode) in **warning** range
- **Hard stop** only when truly necessary
- This mirrors human sprint pressure: *"Stop exploring, just fix the damn thing."*

## Decisions Locked

| Decision | Status | Rationale |
|----------|--------|-----------|
| Collaboration: CLI executor + IDE artifacts | LOCKED | IDE-friendly without plugin APIs |
| Runtime: Local-first | LOCKED | State persists locally, backends are local CLIs |
| Artifact folder default: `ralphy-spec/` | LOCKED (default only) | Matches npm package + CLI name; MUST be overridable |

## Configuration First (Avoid Overfitting)

This upgrade MUST NOT hard-code assumptions that vary across users (package manager, monorepo layout, git usage, model behavior, validator tooling). All new behaviors MUST provide sensible defaults AND explicit override points:

- Artifact root directory MUST be configurable (default `./ralphy-spec/`, override via config and CLI flag such as `--artifact-dir`).
- Budget units MUST be best-effort (USD may be unknown for some backends); the system MUST support token/time/iteration budgets independently, and treat cost as optional/estimated.
- Sprint defaults MUST be configurable mappings (project-level), not baked-in constants.
- “Scope/refactor detection” MUST be a policy with levels (`off` | `warn` | `block`) because automated detection is heuristic.
- Validator definitions MUST be user-defined commands (no npm/pnpm/yarn hard-coding) with pluggable parsers.

## Goals

| Goal | Description |
|------|-------------|
| G1 | Implement three-tier budget model (optimal/warning/hard) |
| G2 | Add sprint size semantics (XS → XL) with default budgets |
| G3 | Create artifact contract (STATUS.md, TASKS.md, BUDGET.md) |
| G4 | Implement budget-aware degrade behaviors |
| G5 | Rename `.ralphy/` to `ralphy-spec/` |

## Non-Goals

- IDE plugin APIs
- Remote execution
- Multi-agent orchestration (v3+)

## Architecture Changes

### Folder Structure (NEW)

```
ralphy-spec/                    # renamed from .ralphy/
├── state.db                    # SQLite database
├── STATUS.md                   # live run snapshot (single source of truth)
├── TASKS.md                    # sprint/task board view
├── BUDGET.md                   # spend + limits visibility
├── runs/
│   └── <runId>.md              # immutable run log (human-readable)
├── logs/                       # raw backend outputs
├── worktrees/                  # git worktrees per task
└── tasks/
    └── <taskId>/
        ├── CONTEXT.md          # exact context sent to backend
        ├── REPAIR.md           # structured repair tickets
        └── NOTES.md            # human or agent notes
```

### Three-Tier Budget Model

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMAL RANGE                            │
│  • Normal operation                                         │
│  • Full context, all features enabled                       │
├─────────────────────────────────────────────────────────────┤
│                    WARNING RANGE                            │
│  • Context shrink (fewer files, only failing tests)         │
│  • Repair-only mode ("fix only, no refactor")               │
│  • Disable optional calls (self-review, planning)           │
│  • Update STATUS.md with pressure signals                   │
├─────────────────────────────────────────────────────────────┤
│                    HARD CAP                                 │
│  • STOP task immediately                                    │
│  • Preserve workspace                                       │
│  • Write failure summary + suggested manual steps           │
│  • Mark task as BLOCKED                                     │
└─────────────────────────────────────────────────────────────┘
```

### Sprint Size → Default Budgets

| Size | Optimal USD | Warning USD | Hard USD | Max Iter | Typical Scope |
|------|-------------|-------------|----------|----------|---------------|
| XS   | $0.20       | $0.35       | $0.50    | 3        | Single file fix |
| S    | $0.50       | $0.80       | $1.20    | 5        | Small function / test |
| M    | $1.20       | $2.00       | $3.00    | 8        | Feature slice |
| L    | $2.50       | $4.00       | $6.00    | 12       | Multi-file feature |
| XL   | $5.00       | $8.00       | $12.00   | 20       | Infra / refactor |

### Sprint Intent → Behavior Constraints

| Intent | Refactor Allowed | Checkpoint Freq | Validator Strictness |
|--------|------------------|-----------------|----------------------|
| fix    | ❌ No            | Every iteration | High                 |
| feature| ✅ Limited       | Every 2 iter    | Medium               |
| refactor| ✅ Yes          | Every iteration | High                 |
| infra  | ✅ Yes           | Every iteration | Medium               |

## Process Roles (Clarified)

| Component | Responsibility |
|-----------|----------------|
| **ralphy-spec** | Supervisor / Orchestrator — owns lifecycle, budgets, state, task graph, correctness definition |
| **Cursor / OpenCode / Claude** | Executor — never trusted for "done", only trusted for producing diffs |
| **Validators** | Ground truth — deterministic pass/fail |
| **Artifacts** | Human interface — IDE users read these to understand agent state |

## Differentiation

**ralphy-spec IS:**
- A spec-governed execution engine
- With budget intelligence (optimal ranges, not just caps)
- Validator-grounded correctness
- IDE-native workflow via artifacts

**ralphy-spec is NOT:**
- A prompt loop
- A chat agent
- A coding assistant

## Success Criteria

- [ ] Three-tier budget tracking works correctly
- [ ] Sprint defaults apply when not specified
- [ ] WARNING range triggers degrade behaviors
- [ ] HARD cap stops task without silent retries
- [ ] STATUS.md updates in real-time
- [ ] BUDGET.md shows clear spend breakdown
- [ ] `ralphy-spec/` folder structure used

## References

- PRD v1.1: ralphy-spec Budget Intelligence + Sprint Semantics
- Depends on: `ralphy-spec-v2` (base engine)
