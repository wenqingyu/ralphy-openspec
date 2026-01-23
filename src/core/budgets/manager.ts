import { BudgetState } from "./state";

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

  getState(): BudgetState {
    return this.state;
  }
}

