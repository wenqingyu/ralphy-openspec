# Spec: Context Packing

## Domain
Core / Context

## ADDED Requirements

### Requirement: Deterministic Context Building
The system MUST build deterministic, bounded context packs for backend calls.

#### Scenario: Context pack assembly
- GIVEN a task with goal, acceptance, and file contract
- WHEN `ContextPacker.build(task)` is called
- THEN it MUST include:
  - Task goal and acceptance criteria
  - Previous issues for this task (top N)
  - Diff summary from last iteration
  - Selected docs/files from task.context
  - File contract constraints

### Requirement: Size Limits by Tier
The system MUST respect max context size per model tier.

#### Scenario: Strong tier limit
- GIVEN model tier "strong" with max 120k chars
- WHEN context pack exceeds limit
- THEN it MUST truncate/prioritize content
- AND include a "context truncated" marker

#### Scenario: Cheap tier limit
- GIVEN model tier "cheap" with max 25k chars
- WHEN context pack is built
- THEN it MUST aggressively prioritize essential content

### Requirement: File Selection Heuristic
The system MUST select relevant files efficiently.

#### Scenario: Files from task context
- GIVEN task.context.files lists specific files
- WHEN context pack is built
- THEN those files MUST be included first

#### Scenario: Files from issues
- GIVEN issues reference `src/api/auth.ts`
- WHEN context pack is built for repair iteration
- THEN `src/api/auth.ts` MUST be included

#### Scenario: Task-owned files
- GIVEN task file contract allows `src/middleware/**`
- WHEN context pack is built
- THEN existing files matching the contract SHOULD be included

## Context Pack Structure

```typescript
export type ContextPack = {
  // Core task info
  task: {
    id: string;
    title: string;
    goal: string;
    acceptance: AcceptanceCriteria[];
  };
  
  // File constraints
  constraints: {
    allowedGlobs: string[];
    forbiddenGlobs: string[];
    allowNewFiles: boolean;
  };
  
  // Previous iteration context
  previousState?: {
    iteration: number;
    diffSummary: string;
    issues: Issue[];
  };
  
  // Reference files
  files: {
    path: string;
    content: string;
    priority: "high" | "medium" | "low";
  }[];
  
  // Reference docs
  docs: {
    path: string;
    content: string;
  }[];
  
  // Repair tickets (if repair iteration)
  repairTickets?: RepairTicket[];
  
  // Metadata
  totalChars: number;
  truncated: boolean;
};
```

## Size Limits

| Model Tier | Max Chars |
|------------|-----------|
| strong     | 120,000   |
| default    | 60,000    |
| cheap      | 25,000    |

## Priority Rules

1. **Always include**: Task goal, acceptance, constraints
2. **High priority**: Issue-referenced files, repair tickets
3. **Medium priority**: task.context.files, task.context.docs
4. **Low priority**: Other files in allowed contract

## Truncation Strategy

When over limit:
1. Truncate low-priority files first
2. Show file headers + relevant regions only
3. Summarize large diffs
4. Keep all error outputs

## Acceptance Criteria

- [ ] Context pack is deterministic (same input → same output)
- [ ] Size limits respected per tier
- [ ] Priority ordering correct
- [ ] Truncation preserves essential info
