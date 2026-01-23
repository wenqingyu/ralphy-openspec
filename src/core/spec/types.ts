export type ProjectSpec = {
  version: string;
  project: {
    name: string;
    repoRoot: string;
    language?: string;
    packageManager?: string;
  };
  defaults: {
    backend: string;
    workspaceMode: "worktree" | "patch";
    checkpointMode: "commit" | "patch";
    validators: string[];
  };
  budgets?: {
    run?: {
      moneyUsd?: number;
      tokens?: number;
      wallTimeMinutes?: number;
      maxIterationsTotal?: number;
    };
    limits?: {
      maxParallelTasks?: number;
      maxParallelValidators?: number;
      commandTimeoutSeconds?: number;
    };
  };
  backends?: Record<
    string,
    {
      command: string;
      modelTiers?: Record<string, Record<string, unknown>>;
    }
  >;
  validators?: Array<{
    id: string;
    run: string;
    timeoutSeconds?: number;
    parser?: string;
  }>;
  tasks: TaskSpec[];
  artifacts?: {
    enabled?: boolean;
    rootDir?: string;
    statusIcons?: "emoji" | "ascii" | "none";
  };
};

export type BudgetTier = {
  usd?: number;
  tokens?: number;
  timeMinutes?: number;
  maxIterations?: number;
};

export type TaskBudget = {
  optimal?: BudgetTier;
  warning?: BudgetTier;
  hard?: BudgetTier;
};

export type FileContract = {
  allowed: string[];
  forbidden: string[];
  allowNewFiles: boolean;
};

export type TaskSpec = {
  id: string;
  title?: string;
  goal?: string;
  deps?: string[];
  priority?: number;
  validators?: string[];
  filesContract?: FileContract;
  budget?: TaskBudget;
};

