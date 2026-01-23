import type { CodingBackend } from "./types";

export class NoopBackend implements CodingBackend {
  constructor(public readonly id: string) {}

  async implement(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message:
        "Noop backend: no code changes performed. Use validators/contracts to verify desired state.",
    };
  }
}

