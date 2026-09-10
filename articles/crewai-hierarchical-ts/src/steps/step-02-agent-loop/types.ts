/**
 * step-02-agent-loop/types.ts
 *
 * Agent Loop 相关类型定义。
 *
 * 对应源码：
 * - agents/crew_agent_executor.py（CrewAgentExecutor）
 * - agent/core.py（Agent 定义）
 */

// types 文件不直接使用 shared 类型，而是定义自己需要的接口
// 所有接口均使用内联类型或本文件定义的类型

export interface ToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface LoopLog {
  iteration: number;
  toolCallCount: number;
  toolResults: ToolCallResult[];
  endedBy: "text" | "tool_calls" | "max_iter" | "error";
}

export {};

export default undefined;
