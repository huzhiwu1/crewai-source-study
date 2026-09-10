/**
 * shared/types.ts
 *
 * 所有步骤共享的核心类型定义。
 *
 * 对应源码（CrewAI v1.15.21）：
 * - agent/core.py（Agent 定义）
 * - task.py（Task 定义）
 * - tools/base_tool.py（Tool 基类）
 */

/** OpenAI-compatible 消息 */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/** OpenAI-compatible tool call */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/** OpenAI-compatible tool schema */
export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionMessage {
  role: "assistant";
  content?: string | null;
  tool_calls?: ToolCall[] | null;
}

export interface ChatCompletionResponse {
  choices: Array<{ message: ChatCompletionMessage }>;
}

/** 最简单的 LLM 接口 */
export interface LLM {
  readonly model: string;
  chat(messages: Message[], tools: ToolSchema[]): Promise<ChatCompletionResponse>;
}

/** Tool 定义 */
export class Tool {
  constructor(
    readonly name: string,
    readonly description: string,
    readonly execute: (args: Record<string, unknown>) => Promise<string>,
    readonly parameters: Record<string, unknown> = {
      type: "object",
      properties: {},
    },
  ) {}
}

/**
 * Agent 定义
 * 对应 agent/core.py:216（class Agent）
 * Agent 只装配执行器，不自己维护推理循环。
 */
export class Agent {
  constructor(
    readonly role: string,
    readonly goal: string,
    readonly backstory: string,
    readonly llm: LLM,
    readonly tools: Tool[],
    readonly allowDelegation = false,
  ) {}
}

/**
 * Task 定义
 * 对应 task.py（Task 类是数据和执行契约）
 */
export class Task {
  constructor(
    readonly description: string,
    readonly expectedOutput: string,
    readonly agent: Agent,
    readonly temporary = false,
  ) {}
}

/**
 * Process 枚举
 * 对应 process.py:4（class Process）
 */
export enum Process {
  Sequential = "sequential",
  Hierarchical = "hierarchical",
}

export {};

// 让模块成为 ES module
export default undefined;
