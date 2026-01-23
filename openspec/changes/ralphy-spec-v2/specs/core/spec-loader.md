# Spec: OpenSpec Loader

## Domain
Core / Spec Loading

## ADDED Requirements

### Requirement: ProjectSpec Schema Validation
The system MUST validate project specs against a Zod schema.

#### Scenario: Valid project.yml is loaded
- GIVEN a valid `openspec/project.yml` file exists
- WHEN `SpecLoader.load()` is called
- THEN it MUST return a validated `ProjectSpec` object
- AND all required fields MUST be present

#### Scenario: Invalid project.yml is rejected
- GIVEN an invalid `openspec/project.yml` file exists
- WHEN `SpecLoader.load()` is called
- THEN it MUST throw a `SpecValidationError`
- AND the error MUST include specific field violations

### Requirement: Task DAG Construction
The system MUST construct a Directed Acyclic Graph from task dependencies.

#### Scenario: Tasks with valid dependencies
- GIVEN tasks with `deps` forming a valid DAG
- WHEN the DAG is constructed
- THEN it MUST produce a topological order
- AND tasks with no deps MUST come first

#### Scenario: Cyclic dependencies detected
- GIVEN tasks with circular `deps`
- WHEN the DAG is constructed
- THEN it MUST throw a `CyclicDependencyError`
- AND the error MUST identify the cycle

### Requirement: File Contract Parsing
The system MUST parse file contracts with allowed/forbidden globs.

#### Scenario: File contract with globs
- GIVEN a task with `files_contract.allowed: ["src/api/**"]`
- WHEN a file `src/api/auth.ts` is checked
- THEN it MUST be allowed
- AND `src/db/schema.ts` MUST be forbidden

## Schema Definition

```typescript
// openspec/project.yml schema
export const ProjectSpecSchema = z.object({
  version: z.string().default("1.0"),
  project: z.object({
    name: z.string(),
    repoRoot: z.string().default("."),
    language: z.string().optional(),
    packageManager: z.string().optional(),
  }),
  defaults: z.object({
    backend: z.enum(["cursor", "opencode", "claude-code"]).default("cursor"),
    workspaceMode: z.enum(["worktree", "patch"]).default("patch"),
    checkpointMode: z.enum(["commit", "patch"]).default("commit"),
    validators: z.array(z.string()).default(["typecheck", "test", "lint"]),
  }).optional(),
  budgets: BudgetsSchema.optional(),
  backends: z.record(BackendConfigSchema).optional(),
  validators: z.array(ValidatorDefSchema),
  tasks: z.array(TaskSpecSchema),
});
```

## Acceptance Criteria

- [ ] Zod schema validates all PRD-specified fields
- [ ] YAML and JSON formats both supported
- [ ] DAG cycle detection works
- [ ] File glob matching uses fast-glob/minimatch
