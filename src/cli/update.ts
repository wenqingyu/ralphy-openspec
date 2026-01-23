import type { Command } from "commander";
import inquirer from "inquirer";
import type { ToolId } from "../types";
import { detectExistingTools } from "../utils/detector";
import { installToolTemplates } from "../utils/installer";
import { resolveProjectDir } from "../utils/paths";

function parseToolsArg(arg?: string): ToolId[] | undefined {
  if (!arg) return undefined;
  const parts = arg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed: ToolId[] = ["cursor", "claude-code", "opencode"];
  const tools: ToolId[] = [];
  for (const p of parts) {
    if ((allowed as string[]).includes(p)) tools.push(p as ToolId);
  }
  return tools.length ? tools : undefined;
}

async function promptForTools(defaultTools: ToolId[]): Promise<ToolId[]> {
  const { tools } = await inquirer.prompt<{ tools: ToolId[] }>([
    {
      type: "checkbox",
      name: "tools",
      message: "Which AI tools do you want to update templates for?",
      choices: [
        { name: "Cursor", value: "cursor" satisfies ToolId },
        { name: "Claude Code", value: "claude-code" satisfies ToolId },
        { name: "OpenCode", value: "opencode" satisfies ToolId },
      ],
      default: defaultTools,
    },
  ]);
  return tools;
}

export function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update Ralph-OpenSpec templates in a project")
    .option("--dir <path>", "Target project directory (default: current directory)")
    .option("--tools <list>", "Comma-separated list: cursor,claude-code,opencode")
    .option("--force", "Overwrite existing files", false)
    .action(async (opts: { dir?: string; tools?: string; force: boolean }) => {
      const dir = resolveProjectDir(opts.dir);
      const parsed = parseToolsArg(opts.tools);
      const detected = await detectExistingTools(dir);
      const defaultTools =
        parsed ??
        (detected.length
          ? detected
          : (["cursor", "claude-code", "opencode"] as ToolId[]));

      const tools = parsed ?? (await promptForTools(defaultTools));
      await installToolTemplates(dir, tools, { force: opts.force });

      process.stdout.write(
        `Updated templates in ${dir}\nUpdated tools: ${tools.join(", ")}\n`
      );
    });
}

