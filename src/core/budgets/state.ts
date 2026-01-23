export type BudgetUsage = {
  usd: number;
  tokens: number;
  wallTimeMs: number;
  iterations: number;
};

export type BudgetLimits = {
  usd?: number;
  tokens?: number;
  wallTimeMs?: number;
  maxIterations?: number;
};

export class BudgetState {
  usage: BudgetUsage = { usd: 0, tokens: 0, wallTimeMs: 0, iterations: 0 };

  constructor(public readonly limits: BudgetLimits) {}

  addUsage(delta: Partial<BudgetUsage>): void {
    this.usage = {
      usd: this.usage.usd + (delta.usd ?? 0),
      tokens: this.usage.tokens + (delta.tokens ?? 0),
      wallTimeMs: this.usage.wallTimeMs + (delta.wallTimeMs ?? 0),
      iterations: this.usage.iterations + (delta.iterations ?? 0),
    };
  }

  exceededHardLimit(): { ok: true } | { ok: false; reason: string } {
    const { usd, tokens, wallTimeMs, iterations } = this.usage;
    const lim = this.limits;

    if (lim.usd !== undefined && usd > lim.usd) return { ok: false, reason: "usd" };
    if (lim.tokens !== undefined && tokens > lim.tokens) return { ok: false, reason: "tokens" };
    if (lim.wallTimeMs !== undefined && wallTimeMs > lim.wallTimeMs)
      return { ok: false, reason: "wall_time" };
    if (lim.maxIterations !== undefined && iterations > lim.maxIterations)
      return { ok: false, reason: "iterations" };
    return { ok: true };
  }
}

