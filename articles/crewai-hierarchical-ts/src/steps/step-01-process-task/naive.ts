/**
 * step-01-process-task/naive.ts
 *
 * 对照组：直接写一个 for 循环调用 agent.run()。
 * 说明这种方式无法统一上下文、输出和生命周期。
 */

import type { Agent } from "../../shared/types.js";
import { naiveNote } from "../../shared/output.js";

/**
 * 朴素方案：直接 for 循环 + 直接调用 agent。
 *
 * 问题：
 * 1. 没有统一的 Task 数据契约——每个 agent 的返回值格式随意
 * 2. 无法跨 Task 传递上下文
 * 3. sequential 和 hierarchical 的差异全部写死在循环体里
 * 4. 无法统一做 checkpoint、条件执行、async
 */
export async function naiveKickoff(
  agents: Agent[],
  tasks: string[],
  executor: (agent: Agent, taskDesc: string) => Promise<string>,
): Promise<string[]> {
  // ⚠️ 对照组：直接循环，没有任何编排抽象
  const results: string[] = [];
  for (let i = 0; i < agents.length; i++) {
    naiveNote(`直接执行第 ${i + 1} 个 Task`);
    const output = await executor(agents[i], tasks[i]);
    results.push(output);
  }
  // ❌ 结果只是字符串数组，没有 Task 元数据、没有追踪
  naiveNote("结果是无类型的字符串数组，丢失 Task 元数据和生命周期信息");
  return results;
}

export {};

export default undefined;
