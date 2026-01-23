# Spec: Persistence Layer

## Domain
Core / Persistence

## ADDED Requirements

### Requirement: SQLite Storage
The system MUST use SQLite for persistence (recommended) or JSONL + snapshot JSON as fallback.

#### Scenario: Database initialization
- GIVEN `.ralphy/` directory exists
- WHEN engine starts
- THEN it MUST create/open `.ralphy/ralphy.db`
- AND create required tables if not exist

### Requirement: Ledger Events
The system MUST append all events to an immutable ledger.

#### Scenario: Event appended
- GIVEN a `backend_call_finished` event
- WHEN `ledger.append(event)` is called
- THEN it MUST insert into `ledger` table
- AND assign auto-incrementing id and timestamp

#### Scenario: Event types
The following event types MUST be supported:
- `run_started`, `run_finished`
- `task_started`, `task_finished`
- `phase_entered`
- `backend_call_started`, `backend_call_finished`
- `validator_started`, `validator_finished`
- `budget_degrade_applied`
- `checkpoint_created`
- `issue_recorded`

### Requirement: Run State
The system MUST persist run state across restarts.

#### Scenario: Resume interrupted run
- GIVEN a run was interrupted at task "auth-002"
- WHEN `ralphy-spec run` is executed again
- THEN it MUST detect the interrupted run
- AND prompt to resume or start fresh

### Requirement: Issue Tracking
The system MUST track issues with deduplication by signature.

#### Scenario: Issue count incremented
- GIVEN an issue with signature "typecheck:src/api.ts:42:..."
- WHEN the same issue appears in the next iteration
- THEN `count` MUST be incremented
- AND a new row MUST NOT be created

## Database Schema

```sql
-- Runs table
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,  -- 'running' | 'completed' | 'failed' | 'stopped'
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  config_json TEXT NOT NULL
);

-- Tasks table
CREATE TABLE tasks (
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  iter_count INTEGER DEFAULT 0,
  started_at INTEGER,
  ended_at INTEGER,
  last_phase TEXT,
  PRIMARY KEY (run_id, task_id),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Ledger table (append-only)
CREATE TABLE ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  task_id TEXT,
  phase TEXT,
  duration_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  tokens_total INTEGER,
  cost_usd REAL,
  is_estimated INTEGER,
  meta_json TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Issues table
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  ts INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  UNIQUE (run_id, signature)
);

-- Checkpoints table
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  git_ref TEXT NOT NULL,
  summary TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Indexes
CREATE INDEX idx_ledger_run_id ON ledger(run_id);
CREATE INDEX idx_ledger_ts ON ledger(ts);
CREATE INDEX idx_issues_signature ON issues(signature);
```

## TypeScript Interface

```typescript
export interface PersistenceLayer {
  // Runs
  createRun(config: ProjectSpec): Promise<Run>;
  getRun(id: string): Promise<Run | null>;
  updateRunStatus(id: string, status: RunStatus): Promise<void>;
  
  // Tasks
  getTaskState(runId: string, taskId: string): Promise<TaskState | null>;
  updateTaskState(runId: string, taskId: string, state: Partial<TaskState>): Promise<void>;
  
  // Ledger
  appendEvent(event: LedgerEvent): Promise<void>;
  getRecentEvents(runId: string, limit: number): Promise<LedgerEvent[]>;
  
  // Issues
  recordIssue(runId: string, taskId: string, issue: Issue): Promise<void>;
  getIssuesByTask(runId: string, taskId: string): Promise<StoredIssue[]>;
  
  // Checkpoints
  createCheckpoint(checkpoint: Checkpoint): Promise<void>;
  getCheckpoints(runId: string): Promise<Checkpoint[]>;
}

export type LedgerEvent = {
  id?: number;
  runId: string;
  taskId?: string;
  ts: number;
  type: LedgerEventType;
  phase?: string;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  tokensTotal?: number;
  costUsd?: number;
  isEstimated?: boolean;
  meta?: Record<string, unknown>;
};
```

## Acceptance Criteria

- [ ] SQLite database created on first run
- [ ] All tables created with correct schema
- [ ] Ledger events append-only (no updates/deletes)
- [ ] Issue deduplication by signature
- [ ] Run state persists across restarts
