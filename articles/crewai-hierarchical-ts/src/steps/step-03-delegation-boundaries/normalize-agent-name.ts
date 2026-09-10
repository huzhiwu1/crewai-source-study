/** 兼容 LLM 返回的引号、大小写、空白和字段别名。 */

export function normalizeAgentName(name: string | undefined | null): string {
  if (!name) return "";
  return name.replace(/["“”]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function extractCoworker(args: Record<string, unknown>): string | undefined {
  const value = args.coworker ?? args.co_worker ?? args.agent_name;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
