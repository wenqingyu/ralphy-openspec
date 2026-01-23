export class BudgetExhaustedError extends Error {
  readonly name = "BudgetExhaustedError";
  constructor(message: string) {
    super(message);
  }
}

