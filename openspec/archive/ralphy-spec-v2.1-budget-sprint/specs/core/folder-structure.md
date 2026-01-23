# Spec: Folder Structure (Renamed to `ralphy-spec/`)

## Domain
Core / Structure

## MODIFIED Requirements

### Requirement: Artifact Folder Location
The system MUST use `ralphy-spec/` instead of `.ralphy/` as the artifact folder.

#### Scenario: Init creates ralphy-spec folder
- GIVEN a project without ralphy-spec configuration
- WHEN `ralphy-spec init` is run
- THEN it MUST create the artifact root folder
- AND by default it MUST be `./ralphy-spec/`
- AND it MUST be overridable via config and CLI flag such as `--artifact-dir`

#### Scenario: Backward compatibility
- GIVEN a project with existing `.ralphy/` folder
- WHEN `ralphy-spec run` is executed
- THEN it SHOULD migrate `.ralphy/` to `ralphy-spec/`
- AND warn user about migration

## ADDED Requirements

### Requirement: Folder Structure
The `ralphy-spec/` folder MUST follow this structure.

#### Scenario: Full folder structure
- GIVEN a run in progress
- WHEN folder is inspected
- THEN it MUST contain:
  ```
  ralphy-spec/
  ├── state.db              # SQLite database
  ├── STATUS.md             # live run snapshot
  ├── TASKS.md              # task board view
  ├── BUDGET.md             # spend + limits
  ├── runs/                 # immutable run logs
  │   └── <runId>.md
  ├── logs/                 # raw backend outputs
  │   └── <runId>/
  │       └── <taskId>-<iteration>.log
  ├── worktrees/            # git worktrees (if worktree mode)
  │   └── <taskId>/
  └── tasks/                # per-task artifacts
      └── <taskId>/
          ├── CONTEXT.md    # exact context sent to backend
          ├── REPAIR.md     # structured repair tickets
          └── NOTES.md      # human or agent notes
  ```

### Requirement: File Ownership
Each file type MUST have clear ownership and update semantics.

#### Scenario: STATUS.md ownership
- GIVEN STATUS.md exists
- WHEN engine updates status
- THEN it MUST atomically overwrite the file
- AND previous content is replaced (not appended)

#### Scenario: runs/<runId>.md ownership
- GIVEN a run completes
- WHEN run log is finalized
- THEN it MUST be created once and never modified
- AND it MUST be human-readable markdown

#### Scenario: tasks/<taskId>/CONTEXT.md ownership
- GIVEN a task iteration starts
- WHEN context pack is built
- THEN CONTEXT.md MUST be overwritten with current iteration context
- AND previous iteration context is lost

## TypeScript Interface

```typescript
export interface FolderManager {
  // Paths
  getRootDir(): string;                          // configurable, default ./ralphy-spec/
  getDatabasePath(): string;                     // <root>/state.db
  getStatusPath(): string;                       // <root>/STATUS.md
  getTasksPath(): string;                        // <root>/TASKS.md
  getBudgetPath(): string;                       // <root>/BUDGET.md
  getRunLogPath(runId: string): string;          // <root>/runs/<runId>.md
  getTaskDir(taskId: string): string;            // <root>/tasks/<taskId>/
  getWorktreeDir(taskId: string): string;        // <root>/worktrees/<taskId>/
  getLogPath(runId: string, taskId: string, iter: number): string;
  
  // Initialization
  ensureStructure(): Promise<void>;
  
  // Migration
  migrateFromLegacy(): Promise<boolean>;  // returns true if migrated
}

// Folder structure constants
export const FOLDERS = {
  ROOT: "ralphy-spec", // default only; MUST be configurable
  RUNS: "runs",
  LOGS: "logs",
  WORKTREES: "worktrees",
  TASKS: "tasks",
} as const;

export const FILES = {
  DATABASE: "state.db",
  STATUS: "STATUS.md",
  TASKS: "TASKS.md",
  BUDGET: "BUDGET.md",
  CONTEXT: "CONTEXT.md",
  REPAIR: "REPAIR.md",
  NOTES: "NOTES.md",
} as const;
```

## Migration Strategy

When `.ralphy/` exists:
1. Log warning: "Found legacy .ralphy/ folder, migrating to ralphy-spec/"
2. Copy `state.db` if exists
3. Copy `config.json` to new location
4. Create new folder structure
5. Optionally remove `.ralphy/` (with `--cleanup-legacy` flag)

## Environment Compatibility (Avoid Hard Assumptions)

- Artifact root MAY be configured outside the repo (e.g. `~/.local/share/ralphy-spec/<repoHash>/`) to avoid clutter; this MUST be supported as long as worktree/patch paths remain correct.
- If the workspace is read-only (CI, locked directory), artifact writes MUST fail gracefully and fall back to database-only operation (unless artifacts are required by config).

## .gitignore Recommendations

```gitignore
# ralphy-spec artifacts
ralphy-spec/state.db
ralphy-spec/logs/
ralphy-spec/worktrees/

# Keep these for visibility
# ralphy-spec/STATUS.md
# ralphy-spec/TASKS.md
# ralphy-spec/BUDGET.md
# ralphy-spec/runs/
# ralphy-spec/tasks/
```

## Acceptance Criteria

- [ ] `ralphy-spec/` used instead of `.ralphy/`
- [ ] All subfolders created on init
- [ ] Migration from `.ralphy/` works
- [ ] File paths resolve correctly
- [ ] Worktree folder integrates with git worktree command
