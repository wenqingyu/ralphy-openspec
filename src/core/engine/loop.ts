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
import { BudgetExhaustedError } from "../budgets/errors";
import { buildContextPack } from "./context-pack";
import { buildRepairNotes } from "./repair";
import type { TaskBudgetConfig } from "../budgets/tiers";
import { buildFailureSummary } from "../reporting/failure-summary";
import { writeStatus } from "../artifacts/status-writer";
import { writeTasksBoard } from "../artifacts/tasks-writer";
import { writeBudgetReport } from "../artifacts/budget-writer";
import { writeTaskContext, writeTaskRepair } from "../artifacts/task-artifacts";
import { writeRunLogOnce } from "../artifacts/run-log-writer";
import { enforceSprintConstraints } from "./constraints";
import { detectScopeViolations } from "../workspace/scope-detector";
import { SPRINT_INTENT_CONSTRAINTS } from "../spec/sprint-defaults";
import type { Issue } from "../validators/types";

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
    let artifactsEnabled = Boolean(opts.spec.artifacts?.enabled);
    const artifactsRootDir = opts.spec.artifacts?.rootDir;
    const artifactsStatusIcons = opts.spec.artifacts?.statusIcons ?? "emoji";

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
    const runBudgetManager = new BudgetManager(budgetState);

    persistence.createRun({
      runId,
      repoRoot: opts.repoRoot,
      backendId: opts.backend.id,
      workspaceMode: opts.workspace.mode,
    });
    ledger.event({ kind: "run_started", message: "Run started", data: { runId } });
    const safeArtifact = async (fn: () => Promise<void>) => {
      if (!artifactsEnabled) return;
      try {
        await fn();
      } catch (e: any) {
        artifactsEnabled = false;
        ledger.event({
          kind: "artifact_error",
          message: `Artifact write failed; disabling artifacts for this run: ${
            e?.message ? String(e.message) : String(e)
          }`,
        });
      }
    };
    await safeArtifact(async () => {
      await writeStatus({
        repoRoot: opts.repoRoot,
        rootDir: artifactsRootDir,
        runId,
        backendId: opts.backend.id,
        workspaceMode: opts.workspace.mode,
        phase: "RUN",
        message: "Run started",
      });
    });

    const finalizeArtifacts = async (outcome: RunOutcome) => {
      if (!artifactsEnabled) return;
      const ledgerEvents = persistence.listLedger({ runId, limit: 5000 });
      await safeArtifact(async () => {
        await writeTasksBoard({
          repoRoot: opts.repoRoot,
          rootDir: artifactsRootDir,
          runId,
          statusIcons: artifactsStatusIcons,
          specTasks: opts.spec.tasks ?? [],
          rows: persistence.listTasksForRun({ runId }),
        });
      });
      await safeArtifact(async () => {
        await writeBudgetReport({
          repoRoot: opts.repoRoot,
          rootDir: artifactsRootDir,
          runId,
          ledgerEvents,
        });
      });
      await safeArtifact(async () => {
        await writeRunLogOnce({
          repoRoot: opts.repoRoot,
          rootDir: artifactsRootDir,
          runId,
          outcome: outcome.ok
            ? { ok: true }
            : { ok: false, exitCode: outcome.exitCode, reason: outcome.reason },
          ledgerEvents: ledgerEvents.map((e) => ({
            ts: e.ts,
            kind: e.kind,
            message: e.message,
            taskId: e.taskId,
          })),
        });
      });
    };

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
        await finalizeArtifacts({ ok: true, runId });
        return { ok: true, runId };
      }

      for (const taskId of planOrder) {
        const task = dag.tasksById.get(taskId) ?? tasks.find((t) => t.id === taskId);
        if (!task) {
          persistence.finishRun({ runId, status: "error" });
          const outcome: RunOutcome = {
            ok: false,
            runId,
            exitCode: 4,
            reason: `Unknown task id: ${taskId}`,
          };
          await finalizeArtifacts(outcome);
          return outcome;
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
          runBudgetManager,
          artifacts: artifactsEnabled ? { rootDir: artifactsRootDir } : null,
        });

        if (!outcome.ok) {
          persistence.finishRun({
            runId,
            status: outcome.exitCode === 2 || outcome.exitCode === 3 ? "stopped" : "error",
          });
          await finalizeArtifacts(outcome);
          return outcome;
        }
      }

      ledger.event({ kind: "run_done", message: "All tasks done" });
      persistence.finishRun({ runId, status: "success" });
      const okOutcome: RunOutcome = { ok: true, runId };
      await finalizeArtifacts(okOutcome);
      return okOutcome;
    } catch (err: any) {
      ledger.event({
        kind: "run_error",
        message: err?.message ? String(err.message) : String(err),
      });
      persistence.finishRun({ runId, status: "error" });
      const outcome: RunOutcome = {
        ok: false,
        runId,
        exitCode: 4,
        reason: err?.message ? String(err.message) : String(err),
      };
      await finalizeArtifacts(outcome);
      return outcome;
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
    runBudgetManager: BudgetManager;
    artifacts: { rootDir?: string } | null;
  }): Promise<RunOutcome> {
    const { task, runId, persistence, ledger, runBudgetManager } = args;
    let artifacts = args.artifacts;

    let phase: Phase = "PLAN";
    persistence.upsertTaskState({ runId, taskId: task.id, status: "running", phase });
    ledger.event({ taskId: task.id, kind: "task_started", message: "Task started" });
    const refreshArtifacts = async () => {
      if (!artifacts) return;
      const ledgerEvents = persistence.listLedger({ runId, limit: 5000 });
      try {
        await writeTasksBoard({
          repoRoot: args.repoRoot,
          rootDir: artifacts.rootDir,
          runId,
          statusIcons: args.spec.artifacts?.statusIcons ?? "emoji",
          specTasks: args.spec.tasks ?? [],
          rows: persistence.listTasksForRun({ runId }),
        });
        await writeBudgetReport({
          repoRoot: args.repoRoot,
          rootDir: artifacts.rootDir,
          runId,
          ledgerEvents,
        });
      } catch (e: any) {
        artifacts = null;
        ledger.event({
          taskId: task.id,
          kind: "artifact_error",
          message: `Artifact write failed; disabling artifacts for this task: ${
            e?.message ? String(e.message) : String(e)
          }`,
        });
      }
    };
    await refreshArtifacts();
    if (artifacts) {
      try {
        await writeStatus({
          repoRoot: args.repoRoot,
          rootDir: artifacts.rootDir,
          runId,
          backendId: args.backend.id,
          workspaceMode: args.workspace.mode,
          taskId: task.id,
          phase,
          iteration: 0,
          message: "Task started",
        });
      } catch (e: any) {
        artifacts = null;
        ledger.event({
          taskId: task.id,
          kind: "artifact_error",
          message: `STATUS.md write failed; disabling artifacts: ${
            e?.message ? String(e.message) : String(e)
          }`,
        });
      }
    }

    const maxIter =
      task.budget?.hard?.maxIterations ??
      args.spec.budgets?.run?.maxIterationsTotal ??
      12;

    const lastSignatures: string[] = [];

    await args.workspace.prepare(task.id);
    const cwd = args.workspace.getWorkingDir(task.id);

    const taskBudgetConfig = this.toTaskBudgetConfig(task) ?? null;
    const taskBudgetState = new BudgetState({
      usd: taskBudgetConfig?.hard.usd,
      tokens: taskBudgetConfig?.hard.tokens,
      wallTimeMs:
        taskBudgetConfig?.hard.timeMinutes !== undefined
          ? taskBudgetConfig.hard.timeMinutes * 60_000
          : undefined,
      maxIterations: taskBudgetConfig?.hard.maxIterations ?? maxIter,
    });
    const taskBudgetManager = new BudgetManager(taskBudgetState);
    const checkpointEvery =
      task.sprint?.intent ? SPRINT_INTENT_CONSTRAINTS[task.sprint.intent]?.checkpointEveryIterations : undefined;

    let pendingRepairNotes: string | undefined;
    let lastValidatorResults: Record<string, any> | null = null;
    let lastIssues: any[] | null = null;

    const blockHardCap = async (iter: number, reason: string) => {
      const status = taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null;
      ledger.event({
        taskId: task.id,
        kind: "hard_cap",
        message: `HARD cap reached: blocking task (preserving workspace)`,
        data: status ?? undefined,
      });
      persistence.upsertTaskState({
        runId,
        taskId: task.id,
        status: "blocked",
        phase: "DIAGNOSE",
        iteration: iter,
        lastError: reason,
      });
      if (artifacts) {
        try {
          await writeStatus({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            runId,
            backendId: args.backend.id,
            workspaceMode: args.workspace.mode,
            taskId: task.id,
            phase: "DIAGNOSE",
            iteration: iter,
            tier: "hard",
            budgetStatus: status,
            message: `Blocked: ${reason} (workspace preserved)`,
          });
        } catch {
          artifacts = null;
        }
      }
      ledger.event({
        taskId: task.id,
        kind: "failure_summary",
        message: "Failure summary (hard cap)",
        data: {
          markdown: buildFailureSummary({
            runId,
            taskId: task.id,
            reason,
            tier: "hard",
            budgetStatus: status,
            lastIssues: lastIssues?.map((i: any) => ({
              level: i.level,
              kind: i.kind,
              message: i.message,
              file: i.file,
            })),
            ledgerEvents: persistence.listLedger({ runId, limit: 200 }),
          }),
        },
      });
      await refreshArtifacts();
      return { ok: false as const, runId, exitCode: 2, reason: "Hard cap" };
    };

    for (let iter = 1; iter <= maxIter; iter++) {
      const iterStarted = Date.now();

      try {
        // Run-level hard limits
        runBudgetManager.preflightOrThrow({ estimatedUsd: 0, estimatedTokens: 0 });
        // Task-level hard limits (best-effort)
        taskBudgetManager.preflightOrThrow({ estimatedUsd: 0, estimatedTokens: 0 });

        // Hard-cap: do not attempt another backend call once at cap.
        if (taskBudgetConfig && taskBudgetManager.isAtHardCap(taskBudgetConfig)) {
          // Spec requires that "starting another iteration" throws BudgetExhaustedError.
          throw new BudgetExhaustedError("Hard cap reached");
        }
      } catch (e: any) {
        if (e instanceof BudgetExhaustedError) {
          return await blockHardCap(iter, "Hard cap reached");
        }

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
        ledger.event({
          taskId: task.id,
          kind: "failure_summary",
          message: "Failure summary (budget exceeded)",
          data: {
            markdown: buildFailureSummary({
              runId,
              taskId: task.id,
              reason: "Budget exceeded",
              tier: taskBudgetConfig ? taskBudgetManager.getTier(taskBudgetConfig) : "hard",
              budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
              lastIssues: lastIssues?.map((i: any) => ({
                level: i.level,
                kind: i.kind,
                message: i.message,
                file: i.file,
              })),
              ledgerEvents: persistence.listLedger({ runId, limit: 200 }),
            }),
          },
        });
        await refreshArtifacts();
        return { ok: false, runId, exitCode: 2, reason: "Budget limit" };
      }

      const tier = taskBudgetConfig ? taskBudgetManager.getTier(taskBudgetConfig) : "optimal";
      const shouldDegrade = taskBudgetConfig
        ? taskBudgetManager.shouldApplyDegrade(taskBudgetConfig)
        : false;
      if (shouldDegrade) {
        ledger.event({
          taskId: task.id,
          kind: "degrade",
          message: "WARNING tier: degrade behaviors enabled",
        });
      }

      if (shouldDegrade && lastValidatorResults && lastIssues) {
        const ctx = buildContextPack({
          tier: "warning",
          taskId: task.id,
          validatorResults: lastValidatorResults,
          issues: lastIssues,
        });
        ledger.event({
          taskId: task.id,
          kind: "context_pack",
          message: `Context pack built (${ctx.size})`,
        });

        // Optional calls disabling (MVP: only logs, as we don't have optional calls yet).
        ledger.event({
          taskId: task.id,
          kind: "optional_calls_skipped",
          message: "WARNING tier: skipping optional calls (self-review / plan regen)",
        });
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
      if (artifacts) {
        try {
          await writeStatus({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            runId,
            backendId: args.backend.id,
            workspaceMode: args.workspace.mode,
            taskId: task.id,
            phase,
            iteration: iter,
            tier,
            budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
            message: `Executing iteration ${iter}`,
          });
        } catch {
          artifacts = null;
        }
      }

      if (artifacts) {
        // Write task artifacts before backend call (best-effort).
        const ctx =
          lastValidatorResults && lastIssues
            ? buildContextPack({
                tier: shouldDegrade ? "warning" : "optimal",
                taskId: task.id,
                validatorResults: lastValidatorResults,
                issues: lastIssues,
              })
            : {
                size: "full" as const,
                text: [`# Context`, ``, `Task: ${task.id}`, `Iteration: ${iter}`, ``].join("\n"),
              };
        try {
          await writeTaskContext({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            taskId: task.id,
            markdown: ctx.text,
          });
          if (pendingRepairNotes) {
            await writeTaskRepair({
              repoRoot: args.repoRoot,
              rootDir: artifacts.rootDir,
              taskId: task.id,
              markdown: pendingRepairNotes,
            });
          }
        } catch {
          artifacts = null;
        }
      }

      const backendRes = await args.backend.implement(
        { cwd, backendId: args.backend.id },
        {
          task,
          iteration: iter,
          repairNotes:
            pendingRepairNotes ??
            (shouldDegrade
              ? "WARNING tier active (repair-only mode will be enforced on failures)."
              : undefined),
        }
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
        await refreshArtifacts();
        return { ok: false, runId, exitCode: 5, reason: "Backend invocation error" };
      }

      // Record backend usage if provided (best-effort; some backends may not estimate).
      if (backendRes.estimatedUsd !== undefined || backendRes.estimatedTokens !== undefined) {
        runBudgetManager.recordBackendUsage({
          usd: backendRes.estimatedUsd,
          tokens: backendRes.estimatedTokens,
        });
        taskBudgetManager.recordBackendUsage({
          usd: backendRes.estimatedUsd,
          tokens: backendRes.estimatedTokens,
        });
        ledger.event({
          taskId: task.id,
          kind: "backend_usage",
          message: "Backend usage recorded",
          data: {
            usd: backendRes.estimatedUsd ?? 0,
            tokens: backendRes.estimatedTokens ?? 0,
            backendId: args.backend.id,
            phase: "EXEC",
          },
        });
      }

      phase = "VALIDATE";
      if (artifacts) {
        try {
          await writeStatus({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            runId,
            backendId: args.backend.id,
            workspaceMode: args.workspace.mode,
            taskId: task.id,
            phase,
            iteration: iter,
            tier,
            budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
            message: "Running validators",
          });
        } catch {
          artifacts = null;
        }
      }
      const validators = this.resolveValidators(args.spec, task).map((v) => ({
        ...v,
        timeoutMs: v.timeoutMs ?? (args.spec.budgets?.limits?.commandTimeoutSeconds ?? 900) * 1000,
      }));
      const runner = new ValidatorRunner({
        cwd,
        commandTimeoutMs: (args.spec.budgets?.limits?.commandTimeoutSeconds ?? 900) * 1000,
      });

      const results = await runner.runAll(validators);
      const allIssues = Object.entries(results).flatMap(([id, r]) => {
        // If a validator failed but produced no parsed issues, create a generic one.
        const issues =
          !r.ok && r.issues.length === 0
            ? [
                {
                  kind: "unknown" as const,
                  level: "error" as const,
                  message: `Validator "${id}" failed (exit=${r.exitCode ?? "?"})`,
                  raw: { validatorId: id },
                },
              ]
            : r.issues;

        return issues.map((i) => ({
          ...i,
          raw: (i.raw ?? { validatorId: id }) as unknown,
        }));
      });

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

      // Sprint constraints & scope detection (best-effort heuristics).
      const changedFiles = await args.workspace.getChangedFiles(task.id);
      const scopePolicy = args.spec.policies?.scopeGuard ?? "warn";
      const scopeLevel: Issue["level"] =
        scopePolicy === "block" ? "error" : scopePolicy === "warn" ? "warning" : "warning";
      if (scopePolicy !== "off") {
        for (const v of enforceSprintConstraints({ task, changedFiles })) {
          allIssues.push({
            kind: "scope_violation",
            level: scopeLevel,
            message: v.message,
            file: v.file,
            raw: v.raw,
          });
        }
        for (const v of detectScopeViolations({ task, changedFiles })) {
          allIssues.push({
            kind: "scope_violation",
            level: scopeLevel,
            message: v.message,
            file: v.file,
            raw: v,
          });
        }
      }

      const ok =
        Object.values(results).every((r) => r.ok) && allIssues.every((i) => i.level !== "error");
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
        await args.workspace.merge(task.id);
        await args.workspace.cleanup(task.id);
        persistence.upsertTaskState({
          runId,
          taskId: task.id,
          status: "done",
          phase: "DONE",
          iteration: iter,
        });
        ledger.event({ taskId: task.id, kind: "task_done", message: "Task done" });
        if (artifacts) {
          try {
            await writeStatus({
              repoRoot: args.repoRoot,
              rootDir: artifacts.rootDir,
              runId,
              backendId: args.backend.id,
              workspaceMode: args.workspace.mode,
              taskId: task.id,
              phase: "DONE",
              iteration: iter,
              tier,
              budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
              message: "Task done",
            });
          } catch {
            artifacts = null;
          }
        }
        const wallTimeMs = Date.now() - iterStarted;
        runBudgetManager.recordIteration(wallTimeMs);
        taskBudgetManager.recordIteration(wallTimeMs);
        ledger.event({
          taskId: task.id,
          kind: "iteration_complete",
          message: "Iteration complete",
          data: { wallTimeMs, phase: "DONE" },
        });
        await refreshArtifacts();
        return { ok: true, runId };
      }

      // Save failure context for next iteration.
      lastValidatorResults = results;
      lastIssues = allIssues;
      pendingRepairNotes = undefined;

      phase = "DIAGNOSE";
      persistence.upsertTaskState({
        runId,
        taskId: task.id,
        status: "running",
        phase,
        iteration: iter,
        lastError: "Validation failed",
      });
      if (artifacts) {
        try {
          await writeStatus({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            runId,
            backendId: args.backend.id,
            workspaceMode: args.workspace.mode,
            taskId: task.id,
            phase,
            iteration: iter,
            tier,
            budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
            message: "Validation failed",
          });
        } catch {
          artifacts = null;
        }
      }

      if (stuck) {
        ledger.event({
          taskId: task.id,
          kind: "stuck",
          message: "Stuck detected (same issues repeated)",
        });
        await refreshArtifacts();
        return { ok: false, runId, exitCode: 3, reason: "Stuck / max iterations" };
      }

      phase = "REPAIR";
      const tierAfter = taskBudgetConfig ? taskBudgetManager.getTier(taskBudgetConfig) : "optimal";
      const repairNotes = buildRepairNotes({
        tier: tierAfter === "warning" ? "warning" : "optimal",
        issues: allIssues,
      });
      ledger.event({ taskId: task.id, kind: "repair", message: "Retrying (repair loop)" });
      if (artifacts) {
        try {
          await writeStatus({
            repoRoot: args.repoRoot,
            rootDir: artifacts.rootDir,
            runId,
            backendId: args.backend.id,
            workspaceMode: args.workspace.mode,
            taskId: task.id,
            phase,
            iteration: iter,
            tier: tierAfter === "warning" ? "warning" : "optimal",
            budgetStatus: taskBudgetConfig ? taskBudgetManager.getStatus(taskBudgetConfig) : null,
            message: "Repair loop",
          });
        } catch {
          artifacts = null;
        }
      }

      pendingRepairNotes = repairNotes;
      const wallTimeMs = Date.now() - iterStarted;
      runBudgetManager.recordIteration(wallTimeMs);
      taskBudgetManager.recordIteration(wallTimeMs);
      ledger.event({
        taskId: task.id,
        kind: "iteration_complete",
        message: "Iteration complete",
        data: { wallTimeMs, phase },
      });

      // Intent-based checkpointing (best-effort). Only enabled for worktree mode to avoid committing
      // partial changes directly to the main working directory.
      if (
        checkpointEvery &&
        args.workspace.mode === "worktree" &&
        iter % checkpointEvery === 0
      ) {
        await args.workspace.checkpoint(task.id, `Checkpoint iteration ${iter}`);
        ledger.event({
          taskId: task.id,
          kind: "checkpoint",
          message: `Checkpoint created (every ${checkpointEvery} iterations)`,
        });
      }
      await refreshArtifacts();
    }

    ledger.event({
      taskId: task.id,
      kind: "max_iterations",
      message: `Max iterations reached (${maxIter})`,
    });
    const treatAsHardCap =
      Boolean(taskBudgetConfig) && Boolean(taskBudgetManager.isAtHardCap(taskBudgetConfig!));
    if (treatAsHardCap) {
      const status = taskBudgetManager.getStatus(taskBudgetConfig!);
      persistence.upsertTaskState({
        runId,
        taskId: task.id,
        status: "blocked",
        phase: "DIAGNOSE",
        iteration: maxIter,
        lastError: "Hard cap reached",
      });
      ledger.event({
        taskId: task.id,
        kind: "hard_cap",
        message: "HARD cap reached (max iterations): blocking task (preserving workspace)",
        data: status,
      });
      ledger.event({
        taskId: task.id,
        kind: "failure_summary",
        message: "Failure summary (hard cap / max iterations)",
        data: {
          markdown: buildFailureSummary({
            runId,
            taskId: task.id,
            reason: "Hard cap reached (max iterations)",
            tier: "hard",
            budgetStatus: status,
            lastIssues: lastIssues?.map((i: any) => ({
              level: i.level,
              kind: i.kind,
              message: i.message,
              file: i.file,
            })),
            ledgerEvents: persistence.listLedger({ runId, limit: 200 }),
          }),
        },
      });
      await refreshArtifacts();
      return { ok: false, runId, exitCode: 2, reason: "Hard cap" };
    }

    persistence.upsertTaskState({
      runId,
      taskId: task.id,
      status: "blocked",
      phase: "DIAGNOSE",
      iteration: maxIter,
      lastError: "Max iterations reached",
    });
    await refreshArtifacts();
    return { ok: false, runId, exitCode: 3, reason: "Max iterations reached" };
  }

  private toTaskBudgetConfig(task: TaskSpec): TaskBudgetConfig | null {
    const b = task.budget;
    const hardIter = b?.hard?.maxIterations;
    if (!b || hardIter === undefined) return null;
    return {
      optimal: {
        usd: b.optimal?.usd,
        tokens: b.optimal?.tokens,
        timeMinutes: b.optimal?.timeMinutes,
      },
      warning: {
        usd: b.warning?.usd,
        tokens: b.warning?.tokens,
        timeMinutes: b.warning?.timeMinutes,
      },
      hard: {
        usd: b.hard?.usd,
        tokens: b.hard?.tokens,
        timeMinutes: b.hard?.timeMinutes,
        maxIterations: hardIter,
      },
    };
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

