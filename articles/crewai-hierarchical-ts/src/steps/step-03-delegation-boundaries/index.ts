/** Step 03：高密度串联 AgentTools、Delegation、Subagent 和错误边界。 */

import { NoopLLM } from "../../shared/llm.js";
import { Agent, Tool } from "../../shared/types.js";
import { separator, stepTitle, conclusion } from "../../shared/output.js";
import { createAgentTools } from "./agent-tools.js";
import { normalizeAgentName } from "./normalize-agent-name.js";
import {
  checkMaxIterations,
  createManager,
  safeParseToolArgs,
  safeExecuteTool,
} from "./mechanisms.js";

async function main(): Promise<void> {
  separator("Step 03：Delegation、Subagent 与错误边界");
  const llm = new NoopLLM();
  const researcher = new Agent("Senior Researcher", "提供研究发现", "教学角色", llm, []);
  const reviewer = new Agent("Reviewer", "审查结果", "教学角色", llm, []);

  stepTitle("A. AgentTools：coworker 作为统一 Tool 接入 Agent Loop");
  const tools = createAgentTools(
    [researcher, reviewer],
    async (agent, task) => `${agent.role} 收到临时 Task：${task}`,
    async (agent, question) => `${agent.role} 回答：${question}`,
  );
  console.log(`  工具：${tools.map((tool) => tool.name).join("、")}`);
  console.log(`  名称归一化："SENIOR   RESEARCHER" → ${normalizeAgentName("SENIOR   RESEARCHER")}`);
  console.log(`  字段兼容：coworker / co_worker 都由工具入口处理`);
  console.log(`  找不到角色：${await tools[0].execute({ coworker: "unknown", task: "测试" })}`);

  stepTitle("B. Manager：配置装配与任务委派边界");
  const manager = createManager(llm, tools);
  console.log(`  ${manager.role} allowDelegation=${manager.allowDelegation}`);
  try {
    createManager(llm, [...tools, new Tool("database", "普通业务工具", async () => "ok")]);
  } catch (error: unknown) {
    console.log(`  普通工具配置错误：${error instanceof Error ? error.message : String(error)}`);
  }

  stepTitle("C. 边界：可恢复错误返回文本，配置错误直接失败");
  console.log(`  非法 JSON：${safeParseToolArgs('{"coworker":') === null ? "返回 null" : "错误"}`);
  console.log(`  max iteration：${checkMaxIterations(6, 5) ? "触发" : "未触发"}`);
  const result = await safeExecuteTool("broken", {}, async () => {
    throw new Error("下游不可用");
  });
  console.log(`  工具失败：${result.result}`);
  conclusion("AgentTools 复用 Agent Loop，Delegation 创建 temporary Task，边界层保护协议和配置");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`错误：${message}`);
  process.exitCode = 1;
});

export {};
export default undefined;
