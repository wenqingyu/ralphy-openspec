# Spec: Workspace Management

## Domain
Core / Workspace

## ADDED Requirements

### Requirement: Worktree Mode
The system MUST support git worktree isolation for tasks.

#### Scenario: Create worktree for task
- GIVEN workspace mode is "worktree"
- WHEN a task starts PREP phase
- THEN it MUST create `.ralphy/worktrees/<taskId>/`
- AND run `git worktree add` to that path
- AND all backend/validator commands MUST run in that worktree

#### Scenario: Merge successful task
- GIVEN a task passes all validators in worktree mode
- WHEN CHECKPOINT phase completes
- THEN it MUST merge changes via `git merge --squash` or patch apply
- AND the worktree MAY be removed (configurable)

#### Scenario: Revert failed task
- GIVEN a task exceeds max iterations in worktree mode
- WHEN the task stops
- THEN the worktree MUST be preserved for debugging
- AND main repo MUST NOT be affected

### Requirement: Patch Mode
The system MUST support patch-based isolation (simpler mode).

#### Scenario: Patch mode execution
- GIVEN workspace mode is "patch"
- WHEN a task starts PREP phase
- THEN it MUST record the current commit hash as snapshot
- AND execution MUST happen in the main repo

#### Scenario: Patch mode revert
- GIVEN a task fails beyond max iterations in patch mode
- WHEN cleanup occurs
- THEN it MUST revert to the snapshot commit
- AND create a patch file of attempted changes (optional)

### Requirement: File Contract Enforcement
The system MUST enforce file contracts after each EXEC phase.

#### Scenario: Allowed file modified
- GIVEN task contract allows `src/api/**`
- WHEN backend modifies `src/api/auth.ts`
- THEN the change MUST be accepted

#### Scenario: Forbidden file modified
- GIVEN task contract forbids `src/db/**`
- WHEN backend modifies `src/db/schema.ts`
- THEN it MUST create issue `kind: "contract_violation"`
- AND the change MUST be reverted
- AND repair prompt MUST instruct strict compliance

#### Scenario: New file creation
- GIVEN task contract has `allow_new_files: false`
- WHEN backend creates a new file
- THEN it MUST create issue `kind: "contract_violation"`

## TypeScript Interface

```typescript
export interface WorkspaceManager {
  mode: "worktree" | "patch";
  
  prepare(taskId: string): Promise<WorkspaceContext>;
  
  getWorkingDir(taskId: string): string;
  
  getChangedFiles(taskId: string): Promise<string[]>;
  
  enforceContract(
    taskId: string, 
    contract: FileContract
  ): Promise<ContractViolation[]>;
  
  checkpoint(
    taskId: string, 
    message: string
  ): Promise<CheckpointRef>;
  
  merge(taskId: string): Promise<void>;
  
  revert(taskId: string): Promise<void>;
  
  cleanup(taskId: string): Promise<void>;
}

export type FileContract = {
  allowed: string[];       // glob patterns
  forbidden: string[];     // glob patterns
  allowNewFiles: boolean;
};

export type ContractViolation = {
  file: string;
  reason: "forbidden" | "not_allowed" | "new_file_disallowed";
};
```

## Acceptance Criteria

- [ ] Worktree mode creates isolated worktrees per task
- [ ] Patch mode records and can revert to snapshots
- [ ] File contract enforcement catches violations
- [ ] Violations trigger auto-revert and repair prompts
- [ ] Checkpoints create commits with metadata
