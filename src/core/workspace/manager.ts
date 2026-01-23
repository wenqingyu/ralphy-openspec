import type { FileContract } from "../spec/types";

export type WorkspaceMode = "worktree" | "patch";

export type WorkspaceContext = {
  taskId: string;
  workingDir: string;
};

export type CheckpointRef = {
  ref: string;
};

export type ContractViolation = {
  file: string;
  reason: "forbidden" | "not_allowed" | "new_file_disallowed";
};

export interface WorkspaceManager {
  mode: WorkspaceMode;

  prepare(taskId: string): Promise<WorkspaceContext>;

  getWorkingDir(taskId: string): string;

  getChangedFiles(taskId: string): Promise<Array<{ file: string; isNew: boolean }>>;

  enforceContract(taskId: string, contract: FileContract): Promise<ContractViolation[]>;

  checkpoint(taskId: string, message: string): Promise<CheckpointRef>;

  merge(taskId: string): Promise<void>;

  revert(taskId: string): Promise<void>;

  cleanup(taskId: string): Promise<void>;
}

