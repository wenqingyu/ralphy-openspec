import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { ZodError } from "zod";
import { projectSpecSchema } from "./schemas";
import type { ProjectSpec } from "./types";

export class SpecLoader {
  constructor(private readonly repoRoot: string) {}

  async loadProjectSpec(): Promise<ProjectSpec> {
    const ymlPath = path.join(this.repoRoot, "openspec", "project.yml");
    const jsonPath = path.join(this.repoRoot, "openspec", "project.json");

    const rawText = await this.readFirstExisting([ymlPath, jsonPath]);
    const raw =
      rawText.kind === "yml" ? YAML.parse(rawText.text) : JSON.parse(rawText.text);

    try {
      return projectSpecSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        const pretty = err.issues
          .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("\n");
        throw new Error(`Invalid OpenSpec project spec:\n${pretty}`);
      }
      throw err;
    }
  }

  private async readFirstExisting(
    candidates: string[]
  ): Promise<{ kind: "yml" | "json"; path: string; text: string }> {
    for (const p of candidates) {
      try {
        const text = await fs.readFile(p, "utf8");
        return { kind: p.endsWith(".json") ? "json" : "yml", path: p, text };
      } catch {
        // continue
      }
    }
    throw new Error(
      `Missing OpenSpec project file. Expected one of:\n${candidates
        .map((p) => `- ${p}`)
        .join("\n")}`
    );
  }
}

