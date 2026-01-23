import type { Issue } from "./types";

export function issueSignature(i: Issue): string {
  const file = i.file ?? "";
  const line = i.line ?? 0;
  const msg = i.message.replace(/\s+/g, " ").trim();
  return `${i.kind}|${file}|${line}|${msg}`;
}

