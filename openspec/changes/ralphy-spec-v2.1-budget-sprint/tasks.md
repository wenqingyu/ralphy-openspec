# Tasks: ralphy-spec v2.1 — Budget Intelligence + Sprint Semantics

**Change:** `ralphy-spec-v2.1-budget-sprint`  
**Depends on:** `ralphy-spec-v2` (base engine must be implemented first)

---

## Phase 1: Budget Tier System

### 1.1 Budget Schema Extension
- [x] **1.1.1** Extend Zod schema for three-tier budgets
  - File: `src/core/spec/schemas.ts`
  - Add `TaskBudgetConfig` with optimal/warning/hard tiers
  - Test plan: Schema validates sample task with all three tiers

- [x] **1.1.2** Implement budget tier calculation
  - File: `src/core/budgets/tiers.ts`
  - Function: `getBudgetTier(used, config) → "optimal" | "warning" | "hard"`
  - Test plan: Unit tests for tier transitions

- [x] **1.1.3** Extend BudgetManager with tier awareness
  - File: `src/core/budgets/manager.ts`
  - Add: `getTier()`, `shouldApplyDegrade()`, `isAtHardCap()`
  - Test plan: Tier changes trigger at correct thresholds

### 1.2 Degrade Behaviors
- [x] **1.2.1** Implement context shrink in warning range
  - File: `src/core/engine/context-pack.ts`
  - When tier="warning": include only failing test output + issue files
  - Test plan: Context size reduced in warning range

- [x] **1.2.2** Implement repair-only mode
  - File: `src/core/engine/repair.ts`
  - Add constraints: "Do NOT refactor", "Fix only validators"
  - Test plan: Repair prompt contains restriction text

- [x] **1.2.3** Implement optional call disabling
  - File: `src/core/engine/loop.ts`
  - Skip self-review and planning regeneration in warning range
  - Test plan: Self-review skipped when tier="warning"

### 1.3 Hard Cap Behavior
- [x] **1.3.1** Implement graceful task blocking
  - File: `src/core/engine/loop.ts`
  - On hard cap: preserve workspace, write summary, mark BLOCKED
  - Test plan: Task marked BLOCKED, no silent retries

- [x] **1.3.2** Write failure summary on block
  - File: `src/core/reporting/failure-summary.ts`
  - Include: spend breakdown, last issues, suggested manual steps
  - Test plan: Summary contains all required sections

---

## Phase 2: Sprint Semantics

### 2.1 Sprint Schema
- [x] **2.1.1** Add sprint fields to task schema
  - File: `src/core/spec/schemas.ts`
  - Add: `sprint.size` (XS/S/M/L/XL), `sprint.intent` (fix/feature/refactor/infra)
  - Test plan: Schema validates sprint fields

- [x] **2.1.2** Implement sprint defaults
  - File: `src/core/spec/sprint-defaults.ts`
  - Export: `SPRINT_SIZE_DEFAULTS`, `SPRINT_INTENT_CONSTRAINTS`
  - Test plan: Size "M" returns correct default budgets

- [x] **2.1.3** Apply sprint defaults during spec loading
  - File: `src/core/spec/loader.ts`
  - If task has `sprint.size` but no `budget`, apply defaults
  - Test plan: Task with only sprint.size gets correct budget

### 2.2 Sprint Constraints
- [x] **2.2.1** Implement refactor scope enforcement
  - File: `src/core/engine/constraints.ts`
  - XS/S: no refactors, M: limited, L/XL: full
  - Test plan: XS task with refactor triggers scope_violation

- [x] **2.2.2** Implement checkpoint frequency
  - File: `src/core/engine/loop.ts`
  - Checkpoint at frequency based on sprint.intent
  - Test plan: "fix" intent checkpoints every iteration

- [x] **2.2.3** Implement scope violation detection
  - File: `src/core/workspace/scope-detector.ts`
  - Detect unrelated file changes based on sprint intent
  - Test plan: Unrelated change in "fix" task flagged

---

## Phase 3: Artifact System

### 3.1 Folder Structure
- [x] **3.1.1** Rename `.ralphy/` to `ralphy-spec/`
  - Files: `src/core/folders.ts`, `src/cli/init.ts`
  - Test plan: `init` creates `ralphy-spec/` folder

- [x] **3.1.2** Implement folder structure constants
  - File: `src/core/folders.ts`
  - Export: `FOLDERS`, `FILES`, path helpers
  - Test plan: All paths resolve correctly

- [x] **3.1.3** Implement legacy migration
  - File: `src/core/folders.ts`
  - Migrate `.ralphy/` → `ralphy-spec/` with warning
  - Test plan: Migration copies state.db, warns user

### 3.2 Artifact Writers
- [x] **3.2.1** Implement STATUS.md writer
  - File: `src/core/artifacts/status-writer.ts`
  - Update on every phase change
  - Test plan: STATUS.md reflects current phase

- [x] **3.2.2** Implement TASKS.md writer
  - File: `src/core/artifacts/tasks-writer.ts`
  - Update on task state change, show board view
  - Test plan: TASKS.md shows correct status icons

- [x] **3.2.3** Implement BUDGET.md writer
  - File: `src/core/artifacts/budget-writer.ts`
  - Update on spend, show per-task breakdown
  - Test plan: BUDGET.md shows warning indicators

- [x] **3.2.4** Implement task-level artifact writers
  - File: `src/core/artifacts/task-artifacts.ts`
  - Write CONTEXT.md, REPAIR.md, NOTES.md per task
  - Test plan: CONTEXT.md written before each backend call

- [x] **3.2.5** Implement run log writer
  - File: `src/core/artifacts/run-log-writer.ts`
  - Create immutable `runs/<runId>.md` on run completion
  - Test plan: Run log is human-readable, never modified

### 3.3 Artifact Integration
- [x] **3.3.1** Hook artifact writers into engine loop
  - File: `src/core/engine/loop.ts`
  - Call writers at appropriate phase transitions
  - Test plan: All artifacts updated during run

- [x] **3.3.2** Add .gitignore recommendations
  - File: `src/cli/init.ts`
  - Suggest which files to commit vs ignore
  - Test plan: Init outputs gitignore suggestions

---

## Phase 4: Integration & Polish

### 4.1 CLI Updates
- [x] **4.1.1** Update `ralphy-spec status` to read STATUS.md
  - File: `src/cli/status.ts`
  - Primary source: `ralphy-spec/STATUS.md`
  - Test plan: `status` command outputs STATUS.md content

- [x] **4.1.2** Add `ralphy-spec budget` command
  - File: `src/cli/budget.ts`
  - Show BUDGET.md with optional JSON output
  - Test plan: `budget --json` outputs structured data

- [x] **4.1.3** Update help text with sprint/budget concepts
  - File: `src/cli/run.ts`
  - Document sprint sizes and budget tiers
  - Test plan: Help text explains three-tier model

### 4.2 Documentation
- [x] **4.2.1** Update project template with sprint examples
  - File: `src/templates/shared/project-template.yml`
  - Include sprint and budget examples
  - Test plan: Template has valid sprint examples

- [x] **4.2.2** Add artifact documentation
  - Update README with artifact file descriptions
  - Test plan: README explains STATUS/TASKS/BUDGET files

---

## Validation Checklist

Before marking v2.1 complete:
- [ ] Three-tier budget (optimal/warning/hard) working
- [ ] Sprint defaults apply correctly
- [ ] Warning range triggers degrade behaviors
- [ ] Hard cap stops without silent retries
- [ ] STATUS.md updates in real-time
- [ ] TASKS.md shows accurate board view
- [ ] BUDGET.md shows per-task breakdown
- [ ] Task CONTEXT.md written before backend calls
- [ ] `ralphy-spec/` folder used (not `.ralphy/`)
- [ ] Migration from `.ralphy/` works

---

## Dependency Graph

```
Phase 1 (Budget Tiers)
├── 1.1 Schema ─┬─> 1.2 Degrade Behaviors
│               └─> 1.3 Hard Cap Behavior
│
Phase 2 (Sprint)
├── 2.1 Schema ─> 2.2 Constraints
│
Phase 3 (Artifacts) — can run in parallel with Phase 1 & 2
├── 3.1 Folder Structure
├── 3.2 Writers (depends on 3.1)
└── 3.3 Integration (depends on 3.2, 1.2, 1.3)

Phase 4 (Integration)
└── Depends on all previous phases
```

---

## Sprint Sizing for This Change

| Task Group | Size | Rationale |
|------------|------|-----------|
| Budget tier system (1.1-1.3) | M | Core logic, moderate complexity |
| Sprint semantics (2.1-2.2) | S | Schema + simple constraints |
| Artifact system (3.1-3.3) | L | Many files, file I/O |
| CLI updates (4.1) | S | Small changes |
| Docs (4.2) | XS | Template updates |
