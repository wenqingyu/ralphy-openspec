# Tasks: ralphy-spec v2 Implementation

Change: `ralphy-spec-v2`  
Target: Self-correcting, self-governed execution engine

---

## Phase 1: Foundation (MVP, Usable)

### 1.1 Project Structure Refactoring
- [x] **1.1.1** Reorganize `src/` into new structure
  ```
  src/
    cli/           # CLI commands
    core/
      engine/      # Loop state machine
      spec/        # Spec loader + validation
      backends/    # Backend adapters
      validators/  # Validator runner + parsers
      workspace/   # Worktree/patch management
      budgets/     # Budget tracking
      memory/      # Persistence layer
      reporting/   # Status + reports
    utils/
  ```
  - Test plan: `npm run typecheck` passes

- [x] **1.1.2** Add new dependencies to package.json
  - `zod` for schema validation
  - `better-sqlite3` for persistence
  - `execa` for process execution
  - `fast-glob` for file matching
  - `cli-table3` for CLI output
  - Test plan: `npm install && npm run build` succeeds

### 1.2 Spec Loader + Validation
- [ ] **1.2.1** Define Zod schemas for ProjectSpec
  - File: `src/core/spec/schemas.ts`
  - Test plan: Unit tests validate sample YAML/JSON specs

- [ ] **1.2.2** Implement SpecLoader class
  - File: `src/core/spec/loader.ts`
  - Load `openspec/project.yml` or `.json`
  - Test plan: Load sample project.yml, verify parsed object

- [ ] **1.2.3** Implement TaskDAG builder
  - File: `src/core/spec/dag.ts`
  - Topological sort with cycle detection
  - Test plan: Unit test with cyclic deps throws error

- [ ] **1.2.4** Implement FileContract matcher
  - File: `src/core/spec/file-contract.ts`
  - Use `fast-glob` / `minimatch` for glob matching
  - Test plan: Verify allowed/forbidden file detection

### 1.3 Persistence Layer (SQLite)
- [ ] **1.3.1** Create SQLite database schema
  - File: `src/core/memory/schema.sql`
  - Tables: runs, tasks, ledger, issues, checkpoints
  - Test plan: Database created with all tables

- [ ] **1.3.2** Implement PersistenceLayer class
  - File: `src/core/memory/persistence.ts`
  - CRUD operations for all tables
  - Test plan: Unit tests for insert/query operations

- [ ] **1.3.3** Implement LedgerLogger
  - File: `src/core/memory/ledger.ts`
  - Append-only event logging
  - Test plan: Events appended with correct timestamps

### 1.4 Workspace Manager (Patch Mode)
- [ ] **1.4.1** Implement WorkspaceManager interface
  - File: `src/core/workspace/manager.ts`
  - Define interface for prepare/checkpoint/revert

- [ ] **1.4.2** Implement PatchModeWorkspace
  - File: `src/core/workspace/patch-mode.ts`
  - Snapshot commit hash, revert on failure
  - Test plan: Snapshot, modify file, revert restores original

- [ ] **1.4.3** Implement file contract enforcement
  - File: `src/core/workspace/contract-enforcer.ts`
  - Use `git diff --name-only` to detect changes
  - Test plan: Forbidden file change detected

### 1.5 Validator Runner
- [ ] **1.5.1** Implement Validator interface
  - File: `src/core/validators/types.ts`
  - Define ValidateContext, ValidateResult, Issue

- [ ] **1.5.2** Implement ValidatorRunner
  - File: `src/core/validators/runner.ts`
  - Run commands with timeout using `execa`
  - Test plan: Timeout kills long-running command

- [ ] **1.5.3** Implement tsc parser
  - File: `src/core/validators/parsers/tsc.ts`
  - Parse TypeScript compiler output
  - Test plan: Sample tsc output parsed to issues

- [ ] **1.5.4** Implement eslint parser
  - File: `src/core/validators/parsers/eslint.ts`
  - Parse ESLint JSON output
  - Test plan: Sample eslint output parsed

- [ ] **1.5.5** Implement jest parser
  - File: `src/core/validators/parsers/jest.ts`
  - Parse Jest/Vitest output
  - Test plan: Sample test output parsed

### 1.6 Budget Manager
- [ ] **1.6.1** Implement BudgetState tracking
  - File: `src/core/budgets/state.ts`
  - Track USD, tokens, time, iterations at run/task level
  - Test plan: Usage increments correctly

- [ ] **1.6.2** Implement BudgetManager
  - File: `src/core/budgets/manager.ts`
  - Preflight checks, usage recording, degrade triggers
  - Test plan: Preflight throws when budget exceeded

### 1.7 Engine Core (Single Task Loop)
- [ ] **1.7.1** Define Phase enum and transitions
  - File: `src/core/engine/phases.ts`
  - PLAN → PREP → EXEC → VALIDATE → DIAGNOSE → REPAIR → CHECKPOINT → DONE

- [ ] **1.7.2** Implement EngineLoop class
  - File: `src/core/engine/loop.ts`
  - Process single task through all phases
  - Test plan: Mock backend, verify phase transitions

- [ ] **1.7.3** Implement DiagnosePhase
  - File: `src/core/engine/diagnose.ts`
  - Aggregate issues, decide pass/fail/repair
  - Test plan: Failing validators trigger repair

- [ ] **1.7.4** Implement RepairTicket generation
  - File: `src/core/engine/repair.ts`
  - Create focused repair prompts from issues
  - Test plan: Issues converted to repair tickets

### 1.8 Backend Adapters (Stub)
- [ ] **1.8.1** Define CodingBackend interface
  - File: `src/core/backends/types.ts`
  - BackendEnv, ImplementInput, ImplementOutput

- [ ] **1.8.2** Implement CursorBackend (basic)
  - File: `src/core/backends/cursor.ts`
  - Shell out to `cursor` CLI
  - Test plan: Manual test with cursor CLI

- [ ] **1.8.3** Implement OpenCodeBackend (basic)
  - File: `src/core/backends/opencode.ts`
  - Shell out to `opencode` CLI
  - Test plan: Manual test with opencode CLI

- [ ] **1.8.4** Implement ClaudeCodeBackend (basic)
  - File: `src/core/backends/claude-code.ts`
  - Shell out to `claude` CLI
  - Test plan: Manual test with claude CLI

### 1.9 CLI Commands (MVP)
- [x] **1.9.1** Extend `init` command for v2
  - File: `src/cli/init.ts`
  - Create template `openspec/project.yml`
  - Test plan: `ralphy-spec init` creates project.yml

- [x] **1.9.2** Implement `run` command
  - File: `src/cli/run.ts`
  - Flags: --backend, --workspace, --task, --dry-run, --json
  - Test plan: `ralphy-spec run --dry-run` shows plan

- [x] **1.9.3** Implement `status` command
  - File: `src/cli/status.ts`
  - Show current run state, budgets, recent events
  - Test plan: `ralphy-spec status` displays info

- [x] **1.9.4** Implement `report` command
  - File: `src/cli/report.ts`
  - Generate markdown report
  - Test plan: `ralphy-spec report --out r.md` creates file

---

## Phase 2: Production-Ready

### 2.1 Worktree Mode
- [ ] **2.1.1** Implement WorktreeModeWorkspace
  - File: `src/core/workspace/worktree-mode.ts`
  - `git worktree add/remove`
  - Test plan: Worktree created, isolated changes

- [ ] **2.1.2** Implement merge strategy
  - File: `src/core/workspace/merge.ts`
  - `git merge --squash` or patch apply
  - Test plan: Successful task merged to main

### 2.2 File Contract Auto-Revert
- [ ] **2.2.1** Implement auto-revert on violation
  - File: `src/core/workspace/contract-enforcer.ts`
  - Revert forbidden file changes automatically
  - Test plan: Forbidden change reverted, issue created

### 2.3 Issue Deduplication + Stuck Detection
- [ ] **2.3.1** Implement issue signature generation
  - File: `src/core/validators/signatures.ts`
  - Deterministic signature from kind+file+line+message
  - Test plan: Same issue has same signature

- [ ] **2.3.2** Implement stuck detector
  - File: `src/core/engine/stuck-detector.ts`
  - Detect same signature for k iterations
  - Test plan: Stuck flagged after 3 repeated issues

### 2.4 Degrade Mode
- [ ] **2.4.1** Implement tier switching
  - File: `src/core/budgets/degrade.ts`
  - Switch backend model tier
  - Test plan: Degrade triggers tier change

- [ ] **2.4.2** Implement context shrinking
  - File: `src/core/engine/context-pack.ts`
  - Reduce context size for cheaper models
  - Test plan: Context pack respects char limits

### 2.5 Spend Breakdown
- [ ] **2.5.1** Implement spend aggregation
  - File: `src/core/reporting/spend.ts`
  - Group by task, backend, phase
  - Test plan: Report shows per-task spend

### 2.6 Additional CLI Commands
- [ ] **2.6.1** Implement `tail` command
  - File: `src/cli/tail.ts`
  - Stream ledger events
  - Test plan: Events stream in real-time

- [ ] **2.6.2** Implement `checkpoint` command
  - File: `src/cli/checkpoint.ts`
  - Manual checkpoint creation
  - Test plan: Checkpoint commit created

---

## Phase 3: Nice-to-Have (Future)

### 3.1 Multi-Backend Routing
- [ ] **3.1.1** Implement backend selector
  - Route plan/implement/repair to different backends

### 3.2 Better Parsers
- [ ] **3.2.1** Next.js error parser
- [ ] **3.2.2** Vite error parser
- [ ] **3.2.3** pnpm/npm error parser

### 3.3 TUI Dashboard
- [ ] **3.3.1** Implement watch mode with blessed/ink
  - Real-time dashboard

### 3.4 Auto-Splitting Tasks
- [ ] **3.4.1** Implement auto-split on stuck
  - Create child tasks for specific fixes

---

## Validation Checklist

Before marking Phase 1 complete:
- [x] `npm run build` succeeds
- [x] `npm run typecheck` passes
- [x] `ralphy-spec init` creates all v2 files
- [x] `ralphy-spec run --dry-run` validates spec
- [x] `ralphy-spec run --task <id>` executes single task
- [x] `ralphy-spec status` shows run state
- [x] `ralphy-spec report` generates markdown

---

## Dependencies Graph

```
1.1 (structure) ─┬─> 1.2 (spec loader)
                 ├─> 1.3 (persistence)
                 ├─> 1.5 (validators)
                 └─> 1.6 (budgets)

1.2 ─┬─> 1.7 (engine)
1.3 ─┤
1.4 ─┤
1.5 ─┤
1.6 ─┘

1.7 ─> 1.8 (backends) ─> 1.9 (CLI)

Phase 2 depends on Phase 1 completion
```
