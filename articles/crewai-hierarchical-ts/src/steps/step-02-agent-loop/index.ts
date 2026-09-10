/**
 * 学习目标：理解 Agent Loop 的核心机制——工具执行 + 结果回填 + 多轮推理。
 *
 * 对应源码：
 * - agents/crew_agent_executor.py:_invoke_loop（第331行）
 * - agents/crew_agent_executor.py:_invoke_loop_native_tools（第506行）
 * - agents/crew_agent_executor.py:_handle_native_tool_calls（第689行）
 *
 * 对照组：只执行 toolCalls[0]，静默丢弃其他并行调用。
 * CrewAI 思路：遍历全部 tool_calls，逐一执行，按协议回填后继续推理。
 *
 * 本步使用真实 LLM。
 *
 * 跑法：cd articles/crewai-hierarchical-ts && pnpm run step:02
 */

import { RealLLM } from "../../shared/llm.js";
import { Agent, Task, Tool } from "../../shared/types.js";
import { separator, stepTitle, naiveNote, conclusion } from "../../shared/output.js";
import { naiveExecutorRun } from "./naive.js";
import { Executor } from "./executor.js";

async function main(): Promise<void> {
  separator("Step 02：Agent Loop——工具执行 + 结果回填 + 多轮推理");

  const llm = new RealLLM();

  // 两个简单工具
  const calculatorTool = new Tool(
    "calculator",
    "计算数学表达式",
    async (args) => {
      const expr =
        typeof args.expression === "string"
          ? args.expression
          : typeof args.task === "string"
            ? args.task
            : "";
      try {
        return String(Function(`"use strict"; return (${expr})`)());
      } catch {
        return `无法计算：${expr}`;
      }
    },
    {
      type: "object",
      properties: { expression: { type: "string", description: "数学表达式，例如 42*8" } },
      required: ["expression"],
    },
  );

  const echoTool = new Tool(
    "echo",
    "返回输入文本",
    async (args) => {
      return `回声：${typeof args.text === "string" ? args.text : ""}`;
    },
    {
      type: "object",
      properties: { text: { type: "string", description: "需要回声的文本" } },
      required: ["text"],
    },
  );

  const agent = new Agent(
    "计算助手",
    "使用工具回答问题",
    "你是一个计算助手。遇到计算必须调用 calculator 工具，遇到测试回声调用 echo 工具。",
    llm,
    [calculatorTool, echoTool],
  );

  // A. 对照组：只执行 toolCalls[0]
  stepTitle("A. 对照组：只执行 toolCalls[0]");
  try {
    const answer = await naiveExecutorRun(
      agent,
      new Task("同时计算 42*8 和 99*99，然后告诉我两个结果", "计算结果", agent),
    );
    console.log(`  答案：${answer}`);
    naiveNote("如果 LLM 返回两个并行 tool_calls，只有第一个被执行，第二个丢失");
  } catch (err: any) {
    naiveNote(`错误：${err.message}——这正是"静默丢弃 tool_call"的后果`);
  }

  // B. CrewAI 思路：遍历全部 tool_calls
  stepTitle("B. CrewAI 思路：遍历全部 tool_calls，逐一执行并回填");
  try {
    const executor = new Executor(
      agent,
      new Task("同时计算 42*8 和 99*99，然后告诉我两个结果", "计算结果", agent),
    );
    const answer = await executor.run();
    console.log(`  答案：${answer}`);
    console.log(`  执行日志：${JSON.stringify(executor.logs, null, 2)}`);
  } catch (err: any) {
    console.error(`  [错误] ${err.message}`);
  }

  // C. 差异和代价
  stepTitle("C. 差异和代价");
  console.log("  ✅ CrewAI：遍历全部 tool_calls，按 OpenAI 协议回填所有工具结果");
  console.log("  ❌ 朴素方案：只处理 toolCalls[0]，其余静默丢失");
  console.log("  ❌ 朴素方案：LLM 无法使用多个并行工具的结果进行下一步推理");

  conclusion("Agent Loop = LLM → tool_calls → 全部执行 → 回填 → 再 LLM 的循环");
}

main().catch((err: Error) => {
  console.error(`错误：${err.message}`);
  process.exitCode = 1;
});

export {};
export default undefined;
