import type { TaskSpec } from "./types";

export type TaskGraph = {
  tasksById: Map<string, TaskSpec>;
  order: string[];
};

export function buildTaskDAG(tasks: TaskSpec[]): TaskGraph {
  const tasksById = new Map<string, TaskSpec>();
  for (const t of tasks) {
    if (tasksById.has(t.id)) {
      throw new Error(`Duplicate task id: ${t.id}`);
    }
    tasksById.set(t.id, t);
  }

  const indeg = new Map<string, number>();
  const adj = new Map<string, Set<string>>();
  for (const id of tasksById.keys()) {
    indeg.set(id, 0);
    adj.set(id, new Set());
  }

  for (const t of tasks) {
    const deps = t.deps ?? [];
    for (const dep of deps) {
      if (!tasksById.has(dep)) {
        throw new Error(`Task ${t.id} depends on missing task ${dep}`);
      }
      adj.get(dep)!.add(t.id);
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, d] of indeg.entries()) {
    if (d === 0) queue.push(id);
  }

  // Prefer higher priority first (stable-ish by id)
  queue.sort((a, b) => {
    const pa = tasksById.get(a)?.priority ?? 0;
    const pb = tasksById.get(b)?.priority ?? 0;
    if (pa !== pb) return pb - pa;
    return a.localeCompare(b);
  });

  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);

    for (const next of adj.get(id) ?? []) {
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if (indeg.get(next) === 0) {
        queue.push(next);
        queue.sort((a, b) => {
          const pa = tasksById.get(a)?.priority ?? 0;
          const pb = tasksById.get(b)?.priority ?? 0;
          if (pa !== pb) return pb - pa;
          return a.localeCompare(b);
        });
      }
    }
  }

  if (order.length !== tasksById.size) {
    const remaining = [...tasksById.keys()].filter((id) => !order.includes(id));
    throw new Error(`Cycle detected in task dependencies. Remaining: ${remaining.join(", ")}`);
  }

  return { tasksById, order };
}

