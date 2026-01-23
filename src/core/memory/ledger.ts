import type { LedgerEvent, PersistenceLayer } from "./persistence";

export class LedgerLogger {
  constructor(
    private readonly persistence: PersistenceLayer,
    private readonly runId: string
  ) {}

  event(args: { taskId?: string; kind: string; message: string; data?: unknown }): void {
    const ev: LedgerEvent = {
      runId: this.runId,
      taskId: args.taskId,
      ts: new Date().toISOString(),
      kind: args.kind,
      message: args.message,
      data: args.data,
    };
    this.persistence.appendLedger(ev);
  }
}

