import { execa } from "execa";
import type { ValidateContext, ValidateResult, Validator } from "./types";
import { parseTscOutput } from "./parsers/tsc";
import { parseEslintOutput } from "./parsers/eslint";
import { parseJestOutput } from "./parsers/jest";

function parseIssues(parser: Validator["parser"], combinedOutput: string) {
  switch (parser) {
    case "tsc":
      return parseTscOutput(combinedOutput);
    case "eslint":
      return parseEslintOutput(combinedOutput);
    case "jest":
      return parseJestOutput(combinedOutput);
    default:
      return combinedOutput.trim()
        ? [
            {
              kind: "unknown" as const,
              level: "error" as const,
              message: combinedOutput.trim().slice(0, 4000),
            },
          ]
        : [];
  }
}

export class ValidatorRunner {
  constructor(private readonly ctx: ValidateContext) {}

  async runAll(validators: Validator[]): Promise<Record<string, ValidateResult>> {
    const results: Record<string, ValidateResult> = {};
    for (const v of validators) {
      results[v.id] = await this.runOne(v);
    }
    return results;
  }

  async runOne(validator: Validator): Promise<ValidateResult> {
    const started = Date.now();
    const timeoutMs = validator.timeoutMs ?? this.ctx.commandTimeoutMs;

    try {
      const res = await execa(validator.run, {
        cwd: this.ctx.cwd,
        shell: true,
        timeout: timeoutMs,
        reject: false,
        stdio: "pipe",
      });

      const stdout = res.stdout ?? "";
      const stderr = res.stderr ?? "";
      const combined = [stdout, stderr].filter(Boolean).join("\n");
      const issues = parseIssues(validator.parser, combined);

      return {
        ok: res.exitCode === 0,
        exitCode: res.exitCode ?? null,
        durationMs: Date.now() - started,
        issues,
        stdout,
        stderr,
      };
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : String(err);
      return {
        ok: false,
        exitCode: null,
        durationMs: Date.now() - started,
        issues: [
          {
            kind: "unknown",
            level: "error",
            message: msg,
            raw: err,
          },
        ],
        stdout: "",
        stderr: "",
      };
    }
  }
}

