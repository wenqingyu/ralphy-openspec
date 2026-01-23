import type { TaskSpec } from "../spec/types";

export type BackendEnv = {
  cwd: string;
  backendId: string;
  /**
   * When true, backends SHOULD stream their stdout/stderr to the parent process.
   * This is useful for interactive terminal runs.
   */
  stream?: boolean;
  /**
   * Optional path to write a backend transcript (stdout/stderr + metadata).
   * Intended for debugging when terminal output is insufficient.
   */
  logFile?: string;
};

export type ImplementInput = {
  task: TaskSpec;
  iteration: number;
  repairNotes?: string;
};

export type ImplementOutput = {
  ok: boolean;
  message: string;
  estimatedUsd?: number;
  estimatedTokens?: number;
};

export interface CodingBackend {
  id: string;
  implement(env: BackendEnv, input: ImplementInput): Promise<ImplementOutput>;
}

