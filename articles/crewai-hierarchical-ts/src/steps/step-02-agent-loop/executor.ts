/**
 * step-02-agent-loop/executor.ts
 *
 * Agent Executor：管理推理循环。
 *
 * 对应源码：
 * - agents/crew_agent_executor.py:CrewAgentExecutor（第98行）
 * - agents/crew_agent_executor.py:_invoke_loop（第331行）
 * - agents/crew_agent_executor.py:_invoke_loop_native_tools（第506行）
 *
 * 核心职责：
 * 1. 调用 LLM
 * 2. LLM 返回文本 → 结束
 * 3. LLM 返回多个 tool_calls → 执行全部 → 回填 → 继续
 * 4. max_iter 超限 → 停止
 */

import type { Agent, Task, Message, ToolCall, ToolSchema } from "../../shared/types.js";
import { executorLog } from "../../shared/output.js";
import { dispatchToolCalls } from "./tool-dispatcher.js";
import type { LoopLog } from "./types.js";

/**
 * 构造 tool schema（OpenAI-compatible format）。
 * 对应 agents/crew_agent_executor.py:convert_tools_to_openai_schema
 */
export function buildToolSchemas(tools: Agent["tools"]): ToolSchema[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Agent 执行器——一次推理循环。
 * 对应 agents/crew_agent_executor.py:invoke（第230行）
 */
export class Executor {
  readonly logs: LoopLog[] = [];

  constructor(
    private readonly agent: Agent,
    private readonly task: Task,
    private readonly maxIterations = 5,
  ) {}

  async run(): Promise<string> {
    const messages: Message[] = [
      {
        role: "system",
        content: `你是${this.agent.role}。目标：${this.agent.goal}\n背景：${this.agent.backstory}\n请使用中文回答。`,
      },
      { role: "user", content: this.task.description },
    ];

    const toolSchemas = buildToolSchemas(this.agent.tools);
    // 只有有工具的 executor 才发送 tools
    const hasTools = this.agent.tools.length > 0;

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      executorLog(`第 ${iteration} 轮开始`);

      // 调用 LLM
      const response = await this.agent.llm.chat(messages, hasTools ? toolSchemas : []);
      const assistantMsg = response.choices[0].message;
      const toolCalls: ToolCall[] = assistantMsg.tool_calls ?? [];

      executorLog(`tool_calls 数量：${toolCalls.length}`);
      if (toolCalls.length > 0) {
        const names = toolCalls.map((tc) => tc.function.name).join("、");
        executorLog(`工具列表：${names}`);
      }

      if (toolCalls.length === 0) {
        // LLM 返回纯文本 —— 结束
        const content = assistantMsg.content ?? "";
        this.logs.push({
          iteration,
          toolCallCount: 0,
          toolResults: [],
          endedBy: "text",
        });
        executorLog(`结束，原因：LLM 返回文本`);
        return content;
      }

      // 执行全部 tool_calls 并按协议回填
      const toolResults = await dispatchToolCalls(toolCalls, this.agent.tools, messages);
      this.logs.push({
        iteration,
        toolCallCount: toolCalls.length,
        toolResults,
        endedBy: "tool_calls",
      });
      executorLog(`第 ${iteration} 轮完成，共 ${toolCalls.length} 个工具调用，继续下一轮`);
    }

    // max_iter 超限
    this.logs.push({
      iteration: this.maxIterations,
      toolCallCount: 0,
      toolResults: [],
      endedBy: "max_iter",
    });
    throw new Error(`超过最大推理轮次（${this.maxIterations} 轮）`);
  }
}

export {};

export default undefined;
