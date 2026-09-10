/** Step 03 的机制层：AgentTools、Manager、Delegation、Subagent 和错误边界。 */

import { Agent, Task, Tool, type LLM } from "../../shared/types.js";
import { Executor } from "../step-02-agent-loop/executor.js";
import { asString, normalizeAgentName } from "./normalize-agent-name.js";
import { errorLog, traceLog } from "../../shared/output.js";

export class ManagerConfigError extends Error {
  constructor(message: string) {
    super(`[Manager 配置错误] ${message}`);
    this.name = "ManagerConfigError";
  }
}

export function createManager(
  llm: LLM,
  tools: Tool[],
  role = "Manager",
  goal = "协调同事并综合答案",
  backstory = "判断何时委派、如何验收结果。",
): Agent {
  const illegalTools = tools.filter(
    (tool) => tool.name !== "Delegate work to coworker" && tool.name !== "Ask question to coworker",
  );
  if (illegalTools.length > 0) {
    throw new ManagerConfigError(
      `Manager 不应携带普通工具：${illegalTools.map((tool) => tool.name).join("、")}`,
    );
  }
  return new Agent(role, goal, backstory, llm, tools, true);
}

export function makeCoworkerExecutor(
  ExecutorClass: typeof Executor,
  originalTask?: Task,
): (agent: Agent, task: string, context: string) => Promise<string> {
  return async (agent, task, context) => {
    const temporaryTask = new Task(
      `${task}\n补充上下文：${context}`,
      "给 Manager 返回可核验的发现。",
      agent,
      true,
    );
    if (originalTask && temporaryTask === originalTask) {
      throw new Error("委派错误：coworker 不得复用原始 Task");
    }
    traceLog(`已为 ${agent.role} 创建临时 Task（temporary=true）`);
    traceLog(`原始 Task 与 temporary Task 是否为不同对象：${temporaryTask !== originalTask}`);
    traceLog(`${agent.role} 开始自己的 Agent Loop`);
    const result = await new ExecutorClass(agent, temporaryTask).run();
    traceLog(`${agent.role} Agent Loop 完成，结果长度：${result.length} 字符`);
    return result;
  };
}

export class RecoverableToolError {
  constructor(
    readonly message: string,
    readonly suggestion: string,
  ) {}

  toString(): string {
    return `错误：${this.message}。${this.suggestion}`;
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`[配置错误] ${message}`);
    this.name = "ConfigurationError";
  }
}

export function handleToolError(error: unknown): string {
  if (error instanceof RecoverableToolError) {
    errorLog(`工具执行可恢复错误：${error.message}`);
    return error.toString();
  }
  throw error;
}

export function checkMaxIterations(iteration: number, maxIter: number): boolean {
  if (iteration > maxIter) {
    errorLog(`超过最大推理轮次（${maxIter} 轮）`);
    return true;
  }
  return false;
}

export function safeParseToolArgs(argsJson: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(argsJson);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    errorLog(`tool call 参数 JSON 非法：${argsJson.slice(0, 100)}`);
    return null;
  }
}

export async function safeExecuteTool(
  toolName: string,
  args: Record<string, unknown>,
  execute: (args: Record<string, unknown>) => Promise<string>,
): Promise<{ success: boolean; result: string }> {
  try {
    return { success: true, result: await execute(args) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errorLog(`工具 ${toolName} 执行异常：${message}`);
    return { success: false, result: `工具 ${toolName} 执行失败：${message}` };
  }
}

export function selectCoworker(coworkers: Agent[], rawName: unknown): Agent | undefined {
  const name = asString(rawName);
  const normalized = normalizeAgentName(name);
  return coworkers.find((agent) => normalizeAgentName(agent.role) === normalized);
}
