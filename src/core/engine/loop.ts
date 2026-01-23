import crypto from "node:crypto";
import type { ProjectSpec, TaskSpec } from "../spec/types";
import { buildTaskDAG } from "../spec/dag";
import { PersistenceLayer } from "../memory/persistence";
import { LedgerLogger } from "../memory/ledger";
import type { CodingBackend } from "../backends/types";
import type { WorkspaceManager } from "../workspace/manager";
import { ValidatorRunner } from "../validators/runner";
import type { Validator } from "../validators/types";
import { issueSignature } from "../validators/signatures";
import type { Phase } from "./phases";
import { BudgetManager } from "../budgets/manager";
import { BudgetState } from "../budgets/state";

export type EngineOptions = {
  repoRoot: string;
  spec: ProjectSpec;
  backend: CodingBackend;
  workspace: WorkspaceManager;
  taskId?: string;
  dryRun: boolean;
  json: boolean;
};

export type RunOutcome =
  | { ok: true; runId: string }
  | { ok: false; runId: string; exitCode: number; reason: string };

function createRunId(): string {
  return `run_${new Date().toISOString().replace(/[:.]/g, "-")}_${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

export class EngineLoop {
  async run(opts: EngineOptions): Promise<RunOutcome> {
    const runId = createRunId();
    const persistence = await PersistenceLayer.openForRepo(opts.repoRoot);
    const ledger = new LedgerLogger(persistence, runId);

    const runBudget = opts.spec.budgets?.run;
    const budgetState = new BudgetState({
      usd: runBudget?.moneyUsd,
      tokens: runBudget?.tokens,
      wallTimeMs:
        runBudget?.wallTimeMinutes !== undefined
          ? runBudget.wallTimeMinutes * 60_000
          : undefined,
      maxIterations: runBudget?.maxIterationsTotal,
    });
    const budgetManager = new BudgetManager(budgetState);

    persistence.createRun({
      runId,
      repoRoot: opts.repoRoot,
      backendId: opts.backend.id,
      workspaceMode: opts.workspace.mode,
    });
    ledger.event({ kind: "run_started", message: "Run started", data: { runId } });

    try {
      const tasks = opts.spec.tasks ?? [];
      const dag = buildTaskDAG(tasks);

      const planOrder = opts.taskId ? [opts.taskId] : dag.order;

      if (opts.dryRun) {
        ledger.event({
          kind: "dry_run",
          message: "Dry run plan generated",
          data: { tasks: planOrder },
        });
        persistence.finishRun({ runId, status: "success" });
        return { ok: true, runId };
      }

      for (const taskId of planOrder) {
        const task = dag.tasksById.get(taskId) ?? tasks.find((t) => t.id === taskId);
        if (!task) {
          persistence.finishRun({ runId, status: "error" });
          return {
            ok: false,
            runId,
            exitCode: 4,
            reason: `Unknown task id: ${taskId}`,
          };
        }

        const outcome = await this.runOneTask({
          runId,
          task,
          repoRoot: opts.repoRoot,
          spec: opts.spec,
          backend: opts.backend,
          workspace: opts.workspace,
          persistence,
          ledger,
          budgetManager,
        });

        if (!outcome.ok) {
          persistence.finishRun({
            runId,
            status: outcome.exitCode === 2 || outcome.exitCode === 3 ? "stopped" : "error",
          });
          return outcome;
        }
      }

      ledger.event({ kind: "run_done", message: "All tasks done" });
      persistence.finishRun({ runId, status: "success" });
      return { ok: true, runId };
    } catch (err: any) {
      ledger.event({
        kind: "run_error",
        message: err?.message ? String(err.message) : String(err),
      });
      persistence.finishRun({ runId, status: "error" });
      return {
        ok: false,
        runId,
        exitCode: 4,
        reason: err?.message ? String(err.message) : String(err),
      };
    } finally {
      persistence.close();
    }
  }

  private async runOneTask(args: {
    runId: string;
    task: TaskSpec;
    repoRoot: string;
    spec: ProjectSpec;
    backend: CodingBackend;
    workspace: WorkspaceManager;
    persistence: PersistenceLayer;
    ledger: LedgerLogger;
    budgetManager: BudgetManager;
  }): Promise<RunOutcome> {
    const { task, runId, persistence, ledger, budgetManager } = args;

    let phase: Phase = "PLAN";
    persistence.upsertTaskState({ runId, taskId: task.id, status: "running", phase });
    ledger.event({ taskId: task.id, kind: "task_started", message: "Task started" });

    const maxIter =
      task.budget?.hard?.maxIterations ??
      args.spec.budgets?.run?.maxIterationsTotal ??
      12;

    const lastSignatures: string[] = [];

    await args.workspace.prepare(task.id);
    const cwd = args.workspace.getWorkingDir(task.id);

    for (let iter = 1; iter <= maxIter; iter++) {
      const iterStarted = Date.now();

      try {
        budgetManager.preflightOrThrow({ estimatedUsd: 0, estimatedTokens: 0 });
      } catch (e: any) {
        ledger.event({
          taskId: task.id,
          kind: "budget_exceeded",
          message: e?.message ? String(e.message) : "Budget exceeded",
        });
        persistence.upsertTaskState({
          runId,
          taskId: task.id,
          status: "blocked",
          phase: "DIAGNOSE",
          iteration: iter,
          lastError: "Budget exceeded",
        });
        return { ok: false, runId, exitCode: 2, reason: "Budget limit" };
      }

      phase = "EXEC";
      persistence.upsertTaskState({
        runId,
        taskId: task.id,
        status: "running",
        phase,
        iteration: iter,
      });
      ledger.event({ taskId: task.id, kind: "exec", message: `EXEC iteration ${iter}` });

      const backendRes = await args.backend.implement(
        { cwd, backendId: args.backend.id },
        { task, iteration: iter }
      );

      if (!backendRes.ok) {
        persistence.upsertTaskState({
          runId,
          taskId: task.id,
          status: "error",
          phase: "EXEC",
          iteration: iter,
          lastError: backendRes.message,
        });
        ledger.event({
          taskId: task.id,
          kind: "backend_error",
          message: backendRes.message,
        });
        return { ok: false, runId, exitCode: 5, reason: "Backend invocation error" };
      }

      phase = "VALIDATE";
      const validators = this.resolveValidators(args.spec, task).map((v) => ({
        ...v,
        timeoutMs: v.timeoutMs ?? (args.spec.budgets?.limits?.commandTimeoutSeconds ?? 900) * 1000,
      }));
      const runner = new ValidatorRunner({
        cwd,
        commandTimeoutMs: (args.spec.budgets?.limits?.commandTimeoutSeconds ?? 900) * 1000,
      });

      const results = await runner.runAll(validators);
      const allIssues = Object.entries(results).flatMap(([id, r]) =>
        r.issues.map((i) => ({
          ...i,
          raw: i.raw ?? { validatorId: id },
        }))
      );

      // Contract enforcement after EXEC
      if (task.filesContract) {
        const violations = await args.workspace.enforceContract(task.id, task.filesContract);
        if (violations.length) {
          allIssues.push(
            ...violations.map((v) => ({
              kind: "contract_violation" as const,
              level: "error" as const,
              message: `File contract violation: ${v.reason} (${v.file})`,
              file: v.file,
              raw: v,
            }))
          );
        }
      }

      const ok = allIssues.every((i) => i.level !== "error");
      ledger.event({
        taskId: task.id,
        kind: "validate",
        message: ok ? "VALIDATE passed" : "VALIDATE failed",
        data: { ok, issues: allIssues.length },
      });

      const signatures = allIssues.map(issueSignature);
      lastSignatures.push(...signatures);
      while (lastSignatures.length > 50) lastSignatures.shift();

      const recent = lastSignatures.slice(-signatures.length);
      const stuck =
        signatures.length > 0 &&
        recent.length === signatures.length &&
        iter >= 3 &&
        signatures.every((s) => lastSignatures.slice(-signatures.length * 3).includes(s));

      if (ok) {
        phase = "CHECKPOINT";
        await args.workspace.checkpoint(task.id, "Task completed");
        persistence.upsertTaskState({
          runId,
          taskId: task.id,
          status: "done",
          phase: "DONE",
          iteration: iter,
        });
        ledger.event({ taskId: task.id, kind: "task_done", message: "Task done" });
        budgetManager.recordIteration(Date.now() - iterStarted);
        return { ok: true, runId };
      }

      phase = "DIAGNOSE";
      persistence.upsertTaskState({
        runId,
        taskId: task.id,
        status: "running",
        phase,
        iteration: iter,
        lastError: "Validation failed",
      });

      if (stuck) {
        ledger.event({
          taskId: task.id,
          kind: "stuck",
          message: "Stuck detected (same issues repeated)",
        });
        return { ok: false, runId, exitCode: 3, reason: "Stuck / max iterations" };
      }

      phase = "REPAIR";
      ledger.event({ taskId: task.id, kind: "repair", message: "Retrying (repair loop)" });
      budgetManager.recordIteration(Date.now() - iterStarted);
    }

    ledger.event({
      taskId: task.id,
      kind: "max_iterations",
      message: `Max iterations reached (${maxIter})`,
    });
    persistence.upsertTaskState({
      runId,
      taskId: task.id,
      status: "blocked",
      phase: "DIAGNOSE",
      iteration: maxIter,
      lastError: "Max iterations reached",
    });
    return { ok: false, runId, exitCode: 3, reason: "Max iterations reached" };
  }

  private resolveValidators(spec: ProjectSpec, task: TaskSpec): Validator[] {
    const ids = task.validators ?? spec.defaults.validators ?? [];
    const byId = new Map((spec.validators ?? []).map((v) => [v.id, v] as const));

    const validators: Validator[] = [];
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) continue;
      validators.push({
        id: v.id,
        run: v.run,
        timeoutMs: v.timeoutSeconds ? v.timeoutSeconds * 1000 : undefined,
        parser: (v.parser as any) ?? undefined,
      });
    }
    return validators;
  }
}

