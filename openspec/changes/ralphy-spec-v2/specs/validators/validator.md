# Spec: Validators and Parsers

## Domain
Validators / Core

## ADDED Requirements

### Requirement: Validator Interface
All validators MUST implement the `Validator` interface.

#### Scenario: Validator runs command
- GIVEN validator config `run: "pnpm -s typecheck"`
- WHEN `validator.run(ctx)` is called
- THEN it MUST execute the command in `workspaceDir`
- AND respect `timeoutSeconds`

#### Scenario: Validator parses output
- GIVEN validator has `parser: "tsc"`
- WHEN command output contains TypeScript errors
- THEN it MUST parse into structured `Issue[]`
- AND each issue MUST have `kind`, `signature`, `message`

### Requirement: Issue Deduplication
Issues MUST have unique signatures for deduplication.

#### Scenario: Same error in multiple iterations
- GIVEN issue with `file: "src/api.ts", line: 42, message: "Type error"`
- WHEN signature is computed
- THEN it MUST be deterministic: `"typecheck:src/api.ts:42:Type error"`
- AND same issue in next iteration MUST have same signature

### Requirement: Built-in Parsers
The system MUST provide parsers for common tools.

#### Scenario: TypeScript (tsc) parser
- GIVEN tsc output: `src/api.ts(42,5): error TS2345: ...`
- WHEN parsed
- THEN issue MUST have `file: "src/api.ts"`, `line: 42`

#### Scenario: ESLint parser
- GIVEN eslint output with JSON format
- WHEN parsed
- THEN issues MUST be extracted with file/line/rule

#### Scenario: Jest/Vitest parser
- GIVEN test output with failures
- WHEN parsed
- THEN issues MUST identify failing test files and messages

#### Scenario: Unknown parser fallback
- GIVEN validator with no parser or unknown parser
- WHEN command fails
- THEN it MUST create issue `kind: "custom"`
- AND `signature` MUST be hash of error message

### Requirement: Timeout Handling
Validators MUST handle command timeouts.

#### Scenario: Command exceeds timeout
- GIVEN `timeout_seconds: 600` and command runs for 700s
- WHEN timeout is reached
- THEN command MUST be killed
- AND issue `kind: "timeout"` MUST be created
- AND `ValidateResult.ok` MUST be `false`

## TypeScript Interface

```typescript
export interface Validator {
  id: string;
  run(ctx: ValidateContext): Promise<ValidateResult>;
}

export type ValidateContext = {
  workspaceDir: string;
  task: TaskSpec;
  timeoutSeconds: number;
  logger: LedgerLogger;
};

export type ValidateResult = {
  ok: boolean;
  rawOutput: string;
  issues: Issue[];
  durationMs: number;
};

export type Issue = {
  kind: "test" | "lint" | "typecheck" | "build" | "contract" | "timeout" | "custom";
  signature: string;       // dedupe key
  message: string;
  file?: string;
  line?: number;
  hint?: string;
};
```

## Validator Configuration

```yaml
validators:
  - id: "typecheck"
    run: "pnpm -s typecheck"
    timeout_seconds: 600
    parser: "tsc"
  - id: "test"
    run: "pnpm -s test"
    timeout_seconds: 900
    parser: "jest"
  - id: "lint"
    run: "pnpm -s lint"
    timeout_seconds: 600
    parser: "eslint"
  - id: "build"
    run: "pnpm build"
    timeout_seconds: 900
    parser: "custom"
```

## Acceptance Criteria

- [ ] Validator interface implemented
- [ ] tsc, eslint, jest parsers working
- [ ] Timeout kills long-running commands
- [ ] Issue signatures are deterministic
- [ ] Unknown output falls back to custom parser
