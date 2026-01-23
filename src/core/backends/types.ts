import type { TaskSpec } from "../spec/types";

export type BackendEnv = {
  cwd: string;
  backendId: string;
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

