/** 将 coworker 包装成普通 Tool，复用 Agent Loop 的调用协议。 */

import { Tool, type Agent } from "../../shared/types.js";
import { asString, extractCoworker, normalizeAgentName } from "./normalize-agent-name.js";
import { toolLog } from "../../shared/output.js";

export function createAgentTools(
  coworkers: Agent[],
  delegateTaskExecutor: (agent: Agent, task: string, context: string) => Promise<string>,
  askExecutor: (agent: Agent, question: string, context: string) => Promise<string>,
): Tool[] {
  const names = coworkers.map((agent) => agent.role).join("、");
  const findCoworker = (args: Record<string, unknown>): Agent | undefined => {
    const rawName = extractCoworker(args);
    return coworkers.find(
      (agent) => normalizeAgentName(agent.role) === normalizeAgentName(rawName),
    );
  };
  const delegate = new Tool(
    "Delegate work to coworker",
    `把任务交给一名同事。可选同事：${names}`,
    async (args) => {
      const rawName = extractCoworker(args);
      const selected = findCoworker(args);
      if (!selected) return `错误：找不到同事"${rawName ?? ""}"。可选同事：${names}`;
      toolLog(`已选择同事：${selected.role}`);
      return delegateTaskExecutor(selected, asString(args.task), asString(args.context));
    },
    {
      type: "object",
      properties: {
        coworker: { type: "string", description: "同事角色名" },
        task: { type: "string", description: "委派任务" },
        context: { type: "string", description: "额外上下文" },
      },
      required: ["coworker", "task"],
    },
  );
  const ask = new Tool(
    "Ask question to coworker",
    `向一名同事提问。可选同事：${names}`,
    async (args) => {
      const rawName = extractCoworker(args);
      const selected = findCoworker(args);
      if (!selected) return `错误：找不到同事"${rawName ?? ""}"。可选同事：${names}`;
      toolLog(`已向同事提问：${selected.role}`);
      return askExecutor(
        selected,
        asString(args.question) || asString(args.task),
        asString(args.context),
      );
    },
    {
      type: "object",
      properties: {
        coworker: { type: "string", description: "同事角色名" },
        question: { type: "string", description: "要提问的问题" },
        context: { type: "string", description: "额外上下文" },
      },
      required: ["coworker", "question"],
    },
  );
  return [delegate, ask];
}
