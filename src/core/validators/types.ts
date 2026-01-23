export type Issue = {
  kind: "tsc" | "eslint" | "jest" | "contract_violation" | "unknown";
  level: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
  raw?: unknown;
};

export type ValidateContext = {
  cwd: string;
  commandTimeoutMs: number;
};

export type ValidateResult = {
  ok: boolean;
  exitCode: number | null;
  durationMs: number;
  issues: Issue[];
  stdout: string;
  stderr: string;
};

export type Validator = {
  id: string;
  run: string;
  timeoutMs?: number;
  parser?: "tsc" | "eslint" | "jest" | string;
};

