/**
 * 学习目标：理解 Process 枚举如何作为架构开关，Task 作为数据契约而非执行逻辑。
 *
 * 对应源码：
 * - process.py:4（Process 枚举，11 行决定整条链路）
 * - crew.py:1512~1519（_run_sequential 和 _run_hierarchical 都进入 _execute_tasks）
 * - task.py（Task 是数据和执行契约，不直接调用 LLM）
 *
 * 对照组：直接 for 循环调用 agent，无法统一上下文和生命周期。
 * CrewAI 思路：Process 开关 + Task 数据契约 + 共享 _execute_tasks 循环。
 *
 * 本步不调用真实 LLM，只展示数据流。
 *
 * 跑法：cd articles/crewai-hierarchical-ts && pnpm run step:01
 */

import { Agent, Task, Process } from "../../shared/types.js";
import { separator, stepTitle, naiveNote, conclusion } from "../../shared/output.js";
import { naiveKickoff } from "./naive.js";
import { Crew } from "./runtime.js";
import { NoopLLM } from "../../shared/llm.js";

async function main(): Promise<void> {
  separator("Step 01：Process、Task 数据流");

  // 两个简单的 mock agent（不涉及 LLM）
  const noopLLM = new NoopLLM();
  const researcher = new Agent("Researcher", "提供研究发现", "结构装配步骤", noopLLM, []);
  const writer = new Agent("Writer", "撰写报告", "结构装配步骤", noopLLM, []);

  // A. 对照组：朴素 for 循环
  stepTitle("A. 对照组：朴素 for 循环");
  const naiveResults = await naiveKickoff(
    [researcher, writer],
    ["研究 AI Agent 发展趋势", "撰写研究报告"],
    async (agent, desc) => {
      naiveNote(`${agent.role} 执行：${desc}`);
      return `[模拟] ${agent.role} 完成：${desc}`;
    },
  );
  console.log("  朴素结果：", naiveResults);

  // B. CrewAI 思路：Task 数据契约 + 共享执行循环
  stepTitle("B. CrewAI 思路：Task 数据契约 + 共享执行循环");

  // sequential 流程
  const seqTask1 = new Task("研究 AI Agent 发展趋势", "研究发现", researcher);
  const seqTask2 = new Task("撰写研究报告", "最终报告", writer);
  const seqCrew = new Crew([seqTask1, seqTask2], Process.Sequential);
  seqCrew.agentRunner = async (agent, _task) => {
    console.log(`  [执行] ${agent.role} ← Task：${_task.description.slice(0, 30)}...`);
    return `[结果] ${agent.role} 执行完成`;
  };
  const seqResults = await seqCrew.kickoff();
  console.log("  sequential 结果：", seqResults);

  // hierarchical 流程——进入同样的 _execute_tasks 循环
  const hierTask = new Task("协调研究和写作", "最终输出", researcher);
  const hierCrew = new Crew([hierTask], Process.Hierarchical);
  hierCrew.agentRunner = async (agent, _ignored) => {
    console.log(`  [执行] Manager ${agent.role} 执行原始 Task`);
    return `[Manager 结果] 委派同事完成工作`;
  };
  const hierResults = await hierCrew.kickoff();
  console.log("  hierarchical 结果：", hierResults);

  // C. 差异和代价
  stepTitle("C. 差异和代价");
  console.log("  ✅ CrewAI：Process 枚举（11 行）决定两条执行路线");
  console.log("  ✅ CrewAI：sequential 和 hierarchical 最终都进入共享 _execute_tasks 循环");
  console.log("  ✅ Task 是数据和执行契约，不直接调用 LLM");
  console.log("  ❌ 朴素方案：循环体里混着编排逻辑，无法统一上下文和生命周期");

  conclusion("Process 是架构开关，Task 是数据契约，hierarchical 只改变入口和工具装配方式");
}

main().catch((err: Error) => {
  console.error(`错误：${err.message}`);
  process.exitCode = 1;
});

export {};
export default undefined;
