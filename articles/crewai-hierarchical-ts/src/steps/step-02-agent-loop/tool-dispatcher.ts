/**
 * step-02-agent-loop/tool-dispatcher.ts
 *
 * 工具调度器：处理 tool_calls 的解析、执行和结果回填。
 *
 * 对应源码：
 * - agents/crew_agent_executor.py:_handle_native_tool_calls（第689行）
 * - agents/crew_agent_executor.py:_execute_single_native_tool_call
 *
 * 关键设计：
 * - 遍历所有 tool_calls，逐一执行（不再只处理 toolCalls[0]）
 * - 工具可以并行执行
 * - 按 tool_calls 原始顺序回填结果
 * - 按 OpenAI 消息协议：先追加 assistant（含 tool_calls），后追 tool 结果
 */

import type { Tool, ToolCall, Message } from "../../shared/types.js";
import type { ToolCallResult } from "./types.js";
import { executorLog } from "../../shared/output.js";

/**
 * 执行全部 tool_calls 并按协议回填。
 *
 * @param toolCalls LLM 返回的 tool_calls
 * @param tools 可用工具列表
 * @param messages 消息历史（会被修改，追加 assistant + tool 结果）
 * @returns 执行结果列表
 */
export async function dispatchToolCalls(
  toolCalls: ToolCall[],
  tools: Tool[],
  messages: Message[],
): Promise<ToolCallResult[]> {
  // 按 OpenAI 消息协议：一条 assistant 消息带所有 tool_calls，后接逐条 tool 结果
  messages.push({
    role: "assistant",
    content: null,
    tool_calls: toolCalls,
  });
  // 并行执行，但 Promise.all 按输入顺序返回，保证消息顺序稳定。
  const results = await Promise.all(toolCalls.map((call) => executeOne(call, tools)));
  for (const r of results) {
    messages.push({
      role: "tool",
      tool_call_id: r.id,
      content: r.result,
    });
  }

  return results;
}

async function executeOne(call: ToolCall, tools: Tool[]): Promise<ToolCallResult> {
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(call.function.arguments);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("参数必须是 JSON 对象");
    }
    args = parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: call.id,
      name: call.function.name,
      args: {},
      result: `工具参数解析失败：${message}`,
    };
  }

  const tool = tools.find((candidate) => candidate.name === call.function.name);
  if (!tool) {
    return {
      id: call.id,
      name: call.function.name,
      args,
      result: `找不到工具：${call.function.name}。可用工具：${tools.map((item) => item.name).join("、")}`,
    };
  }

  try {
    const result = await tool.execute(args);
    executorLog(`工具：${call.function.name} → ${result.slice(0, 60)}...`);
    return { id: call.id, name: call.function.name, args, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = `工具 ${call.function.name} 执行失败：${message}`;
    executorLog(result);
    return { id: call.id, name: call.function.name, args, result };
  }
}

export {};

export default undefined;
