/**
 * step-02-agent-loop/naive.ts
 *
 * 对照组：只执行 toolCalls[0]，其余 tool_calls 被静默丢弃。
 *
 * 问题：
 * - LLM 可能返回多个并行 tool_calls
 * - 只处理第一个意味着其余调用丢失
 * - Agent 看不到其余工具的执行结果
 * - 某些场景（同时查天气 + 计算）会静默失败
 */

import type {
  Task,
  Agent as AgentType,
  ToolCall,
  Message,
  ToolSchema,
} from "../../shared/types.js";
import { naiveNote } from "../../shared/output.js";

/**
 * 朴素做法：只取 toolCalls[0]。
 *
 * 对应原 bug：const call = toolCalls[0];
 */
export async function naiveExecutorRun(agent: AgentType, task: Task): Promise<string> {
  const messages: Message[] = [
    {
      role: "system",
      content: `你是${agent.role}。目标：${agent.goal}\n背景：${agent.backstory}\n请使用中文回答。`,
    },
    { role: "user", content: task.description },
  ];

  const toolSchemas: ToolSchema[] = agent.tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  for (let iteration = 1; iteration <= 5; iteration++) {
    const response = await agent.llm.chat(messages, toolSchemas);
    const assistantMsg = response.choices[0].message;
    const toolCalls: ToolCall[] = assistantMsg.tool_calls ?? [];
    if (!toolCalls.length) return assistantMsg.content ?? "";

    // ⚠️ 仅处理第一个 tool call
    const call = toolCalls[0];
    naiveNote(
      `只处理 toolCalls[0]：${call.function.name}，丢弃其他 ${toolCalls.length - 1} 个调用`,
    );

    const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
    const tool = agent.tools.find((c) => c.name === call.function.name);
    if (!tool) throw new Error(`找不到工具：${call.function.name}`);
    const result = await tool.execute(args);
    messages.push(
      { role: "assistant", tool_calls: [call], content: null },
      { role: "tool", tool_call_id: call.id, content: result },
    );
  }
  throw new Error("超过最大推理轮次");
}

export {};

export default undefined;
