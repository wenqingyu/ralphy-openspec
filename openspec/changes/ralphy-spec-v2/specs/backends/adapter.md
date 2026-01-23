# Spec: Backend Adapters

## Domain
Backends / Adapter Interface

## ADDED Requirements

### Requirement: Backend Interface
All backends MUST implement the `CodingBackend` interface.

#### Scenario: Backend implements interface
- GIVEN a backend adapter for Cursor
- WHEN registered with the engine
- THEN it MUST provide `id`, `prepare()`, and `implement()` methods
- AND optionally `selfReview()`

### Requirement: Implement Method
The `implement()` method MUST execute the coding task and return structured output.

#### Scenario: Successful implementation
- GIVEN a valid `ImplementInput` with task spec and context
- WHEN `implement()` is called
- THEN it MUST run the backend CLI in `workspaceDir`
- AND return `ImplementOutput` with summary and usage

#### Scenario: Backend captures usage
- GIVEN backend call completes
- WHEN output is parsed
- THEN it SHOULD extract `promptTokens`, `completionTokens`, `totalTokens`
- AND estimate `costUsd` if pricing is configured
- AND set `isEstimated: true` if tokens were approximated

### Requirement: File Contract Constraints
The backend adapter MUST pass file constraints to the AI prompt.

#### Scenario: Constraints in prompt
- GIVEN task has `allowedGlobs: ["src/api/**"]`
- WHEN `implement()` builds the prompt
- THEN it MUST include: "You may only modify files matching: src/api/**"
- AND it MUST include: "Do NOT modify files matching: src/db/**"

### Requirement: Repair Mode
The backend MUST support repair tickets for focused fixes.

#### Scenario: Repair iteration
- GIVEN `repairTickets` contains 3 issues to fix
- WHEN `implement()` is called with iteration > 1
- THEN the prompt MUST focus on: "Fix these specific issues only"
- AND MUST NOT refactor or add new features
- AND MUST only edit allowed files

## TypeScript Interface

```typescript
export interface BackendEnv {
  repoRoot: string;
  workspaceDir: string;
  config: BackendConfig;
  budgetContext: BudgetContext;
  logger: LedgerLogger;
}

export interface CodingBackend {
  id: string;
  prepare(env: BackendEnv): Promise<void>;
  implement(input: ImplementInput): Promise<ImplementOutput>;
  selfReview?(input: ReviewInput): Promise<ReviewOutput>;
}

export type ImplementInput = {
  task: TaskSpec;
  contextPack: ContextPack;
  constraints: {
    allowedGlobs: string[];
    forbiddenGlobs: string[];
    maxChangedFiles?: number;
    maxDiffBytes?: number;
  };
  repairTickets?: RepairTicket[];
  iteration: number;
  modelTier: "cheap" | "default" | "strong";
};

export type ImplementOutput = {
  summary: string;
  backendRawLog?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    isEstimated?: boolean;
  };
};

export type RepairTicket = {
  issueId: string;
  kind: string;
  message: string;
  file?: string;
  line?: number;
  hint?: string;
};
```

## Backend Configurations

```yaml
backends:
  cursor:
    command: "cursor"
    modelTiers:
      default: { hint: "balanced" }
      cheap:   { hint: "cheap" }
      strong:  { hint: "strong" }
  opencode:
    command: "opencode"
    modelTiers:
      default: {}
      cheap:   {}
  claude_code:
    command: "claude"
    modelTiers:
      default: {}
```

## Token Estimation Fallback

When exact token counts are unavailable:
```typescript
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
```

## Acceptance Criteria

- [ ] All three backends (Cursor, OpenCode, Claude Code) implemented
- [ ] Backend runs CLI command in correct working directory
- [ ] Stdout/stderr captured and logged
- [ ] Usage extracted or estimated
- [ ] Repair mode generates focused prompts
