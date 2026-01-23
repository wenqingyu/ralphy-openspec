import { BudgetState } from "./state";
import type { TaskBudgetConfig } from "./tiers";
import { getBudgetStatus, getBudgetTier } from "./tiers";

export class BudgetManager {
  constructor(private readonly state: BudgetState) {}

  preflightOrThrow(args: { estimatedUsd?: number; estimatedTokens?: number }): void {
    const usdAfter = this.state.usage.usd + (args.estimatedUsd ?? 0);
    const tokensAfter = this.state.usage.tokens + (args.estimatedTokens ?? 0);

    if (this.state.limits.usd !== undefined && usdAfter > this.state.limits.usd) {
      throw new Error("Budget limit exceeded (usd)");
    }
    if (
      this.state.limits.tokens !== undefined &&
      tokensAfter > this.state.limits.tokens
    ) {
      throw new Error("Budget limit exceeded (tokens)");
    }
  }

  recordIteration(wallTimeMs: number): void {
    this.state.addUsage({ wallTimeMs, iterations: 1 });
  }

  recordBackendUsage(args: { usd?: number; tokens?: number }): void {
    this.state.addUsage({ usd: args.usd ?? 0, tokens: args.tokens ?? 0 });
  }

  getTier(config?: TaskBudgetConfig): "optimal" | "warning" | "hard" {
    if (!config) return this.state.exceededHardLimit().ok ? "optimal" : "hard";
    return getBudgetTier(this.state.usage, config);
  }

  shouldApplyDegrade(config?: TaskBudgetConfig): boolean {
    return this.getTier(config) === "warning";
  }

  isAtHardCap(config?: TaskBudgetConfig): boolean {
    if (!config) return !this.state.exceededHardLimit().ok;
    return getBudgetStatus(this.state.usage, config).isAtHardCap;
  }

  getStatus(config: TaskBudgetConfig) {
    return getBudgetStatus(this.state.usage, config);
  }

  getState(): BudgetState {
    return this.state;
  }
}

