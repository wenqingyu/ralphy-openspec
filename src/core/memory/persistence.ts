import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { ensureRalphyFolders, FILES, migrateLegacyIfNeeded } from "../folders";

export type RunStatus = "active" | "success" | "stopped" | "error";
export type TaskStatus = "pending" | "running" | "done" | "blocked" | "error";

export type LedgerEvent = {
  runId: string;
  taskId?: string;
  ts: string;
  kind: string;
  message: string;
  data?: unknown;
};

const schemaSql = `
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  repo_root TEXT NOT NULL,
  backend_id TEXT,
  workspace_mode TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,
  phase TEXT,
  iteration INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  last_error TEXT,
  PRIMARY KEY (run_id, task_id)
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  data_json TEXT
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  signature TEXT,
  kind TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  message TEXT NOT NULL,
  raw_json TEXT,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  ref TEXT NOT NULL,
  message TEXT NOT NULL
);
`;

export class PersistenceLayer {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(schemaSql);
  }

  static async openForRepo(repoRoot: string): Promise<PersistenceLayer> {
    const migrated = await migrateLegacyIfNeeded(repoRoot);
    if (migrated.migrated) {
      process.stderr.write(
        `Warning: migrated legacy state folder "${migrated.from}" to "${migrated.to}".\n`
      );
    }
    const ralphyDir = await ensureRalphyFolders(repoRoot);
    const dbPath = path.join(ralphyDir, FILES.db);
    return new PersistenceLayer(dbPath);
  }

  close(): void {
    this.db.close();
  }

  createRun(args: {
    runId: string;
    repoRoot: string;
    backendId?: string;
    workspaceMode?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO runs (id, status, started_at, repo_root, backend_id, workspace_mode)
         VALUES (@runId, 'active', @ts, @repoRoot, @backendId, @workspaceMode)`
      )
      .run({
        runId: args.runId,
        ts: new Date().toISOString(),
        repoRoot: args.repoRoot,
        backendId: args.backendId ?? null,
        workspaceMode: args.workspaceMode ?? null,
      });
  }

  finishRun(args: { runId: string; status: RunStatus }): void {
    this.db
      .prepare(
        `UPDATE runs
         SET status=@status, finished_at=@ts
         WHERE id=@runId`
      )
      .run({ runId: args.runId, status: args.status, ts: new Date().toISOString() });
  }

  upsertTaskState(args: {
    runId: string;
    taskId: string;
    status: TaskStatus;
    phase?: string;
    iteration?: number;
    lastError?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO tasks (run_id, task_id, status, phase, iteration, started_at, last_error)
         VALUES (@runId, @taskId, @status, @phase, @iteration, @startedAt, @lastError)
         ON CONFLICT(run_id, task_id) DO UPDATE SET
           status=excluded.status,
           phase=excluded.phase,
           iteration=excluded.iteration,
           last_error=excluded.last_error`
      )
      .run({
        runId: args.runId,
        taskId: args.taskId,
        status: args.status,
        phase: args.phase ?? null,
        iteration: args.iteration ?? 0,
        startedAt: new Date().toISOString(),
        lastError: args.lastError ?? null,
      });
  }

  appendLedger(event: LedgerEvent): void {
    this.db
      .prepare(
        `INSERT INTO ledger (run_id, task_id, ts, kind, message, data_json)
         VALUES (@runId, @taskId, @ts, @kind, @message, @dataJson)`
      )
      .run({
        runId: event.runId,
        taskId: event.taskId ?? null,
        ts: event.ts,
        kind: event.kind,
        message: event.message,
        dataJson: event.data ? JSON.stringify(event.data) : null,
      });
  }

  listLedger(args: { runId: string; limit?: number }): LedgerEvent[] {
    const rows = this.db
      .prepare(
        `SELECT run_id as runId, task_id as taskId, ts, kind, message, data_json as dataJson
         FROM ledger
         WHERE run_id=@runId
         ORDER BY id DESC
         LIMIT @limit`
      )
      .all({ runId: args.runId, limit: args.limit ?? 50 });

    return rows
      .reverse()
      .map((r: any) => ({
        runId: r.runId,
        taskId: r.taskId ?? undefined,
        ts: r.ts,
        kind: r.kind,
        message: r.message,
        data: r.dataJson ? JSON.parse(r.dataJson) : undefined,
      }));
  }

  listTasksForRun(args: { runId: string }): Array<{
    taskId: string;
    status: TaskStatus;
    phase?: string;
    iteration: number;
    lastError?: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT task_id as taskId, status, phase, iteration, last_error as lastError
         FROM tasks
         WHERE run_id=@runId
         ORDER BY task_id ASC`
      )
      .all({ runId: args.runId });
    return rows.map((r: any) => ({
      taskId: r.taskId,
      status: r.status,
      phase: r.phase ?? undefined,
      iteration: r.iteration ?? 0,
      lastError: r.lastError ?? undefined,
    }));
  }

  getLatestRun(): { runId: string; status: RunStatus; startedAt: string } | null {
    const row = this.db
      .prepare(
        `SELECT id as runId, status, started_at as startedAt
         FROM runs
         ORDER BY started_at DESC
         LIMIT 1`
      )
      .get();
    return row ? (row as any) : null;
  }
}

