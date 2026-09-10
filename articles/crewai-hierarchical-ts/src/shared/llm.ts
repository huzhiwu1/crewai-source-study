/**
 * shared/llm.ts
 *
 * 真实 OpenAI-compatible LLM 客户端封装。
 * 使用 Node 原生 fetch，不引入 LangChain/LangGraph。
 *
 * 对应源码：
 * - llm.py（LLM 对外统一封装）
 * - llms/base_llm.py（LLM 适配器模式基类）
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import type { LLM, Message, ToolSchema, ChatCompletionResponse } from "./types.js";

// pnpm filter 执行子包脚本时 cwd 会变成 workspace package，
// 不能依赖默认 dotenv 查找路径，必须显式指定根 .env 路径
dotenv.config({
  path: resolve(process.cwd(), "../../.env"),
});

export class RealLLM implements LLM {
  callCount = 0;
  readonly baseUrl: string;
  readonly model: string;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL;
    if (!apiKey || !baseUrl || !model) {
      throw new Error("缺少环境变量：请在项目根 .env 中设置 LLM_API_KEY、LLM_BASE_URL、LLM_MODEL");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  async chat(messages: Message[], tools: ToolSchema[]): Promise<ChatCompletionResponse> {
    this.callCount++;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    };
    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0,
    };
    if (tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`LLM 请求失败：HTTP ${response.status} ${body}`);
    }
    const body: unknown = await response.json();
    if (!isChatCompletionResponse(body)) {
      throw new Error("LLM 返回了不符合 Chat Completions 协议的响应");
    }
    return body;
  }
}

/** 仅用于不需要推理的结构装配步骤，绝不会访问网络。 */
export class NoopLLM implements LLM {
  readonly model = "noop";

  async chat(): Promise<ChatCompletionResponse> {
    return { choices: [{ message: { role: "assistant", content: "noop" } }] };
  }
}

function isChatCompletionResponse(value: unknown): value is ChatCompletionResponse {
  if (!value || typeof value !== "object") return false;
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return false;
  const message = (choices[0] as { message?: unknown }).message;
  return Boolean(message && typeof message === "object");
}

export {};
export default undefined;
