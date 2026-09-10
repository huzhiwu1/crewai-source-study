/** Step 04：完整总装——把前 3 步的机制放进一次真实 hierarchical 执行。 */

import { RealLLM } from "../../shared/llm.js";
import { Agent, Process, Task } from "../../shared/types.js";
import { separator, stepTitle, naiveNote, executorLog, conclusion } from "../../shared/output.js";
import { Executor } from "../step-02-agent-loop/executor.js";
import { Crew } from "../step-01-process-task/runtime.js";
import { createAgentTools } from "../step-03-delegation-boundaries/agent-tools.js";
import {
  ConfigurationError,
  RecoverableToolError,
  checkMaxIterations,
  createManager,
  handleToolError,
  makeCoworkerExecutor,
} from "../step-03-delegation-boundaries/mechanisms.js";

async function main(): Promise<void> {
  separator("Step 04：完整总装——真实 LLM hierarchical");
  const llm = new RealLLM();
  const question = "请解释生产级 Agent 为什么要把确定性编排与 LLM 决策分离，并给出三个设计原则。";
  const researcher = new Agent(
    "Researcher",
    "提供研究发现",
    "关注事实、边界和证据。请使用中文回答。",
    llm,
    [],
  );
  const reviewer = new Agent(
    "Reviewer",
    "审查研究结果",
    "关注一致性、完整性和实用性。请使用中文回答。",
    llm,
    [],
  );

  stepTitle("A. 对照组：确定性代码编排");
  const research = await new Executor(researcher, new Task(question, "研究发现", researcher)).run();
  const review = await new Executor(
    reviewer,
    new Task(`审查以下研究结果：${research}`, "审查意见", reviewer),
  ).run();
  naiveNote(
    `固定调用 Researcher → Reviewer，最后由代码拼接：${research.slice(0, 40)}... + ${review.slice(0, 40)}...`,
  );

  stepTitle("B. CrewAI 思路：Process → Crew → Manager → Agent Loop");
  const coworkerExecutor = makeCoworkerExecutor(Executor);
  const delegationTools = createAgentTools(
    [researcher, reviewer],
    coworkerExecutor,
    coworkerExecutor,
  );
  const manager = createManager(
    llm,
    delegationTools,
    "Research Manager",
    "协调同事并综合答案",
    "根据任务需要委派，收到结果后再综合。请使用中文回答。",
  );
  executorLog(`Manager 工具：${manager.tools.map((tool) => tool.name).join("、")}`);

  const originalTask = new Task(question, "综合答案", researcher);
  const crew = new Crew([originalTask], Process.Hierarchical, manager);
  crew.agentRunner = async (agent, task) => {
    // Crew 决定谁执行，Executor 决定如何推理；这是编排与智能的边界。
    return new Executor(agent, new Task(task.description, task.expectedOutput, agent)).run();
  };
  const [result] = await crew.kickoff();
  console.log(`\n  Manager 最终输出：${result.output}`);
  console.log(`  总 LLM 调用次数：${llm.callCount}`);

  stepTitle("C. 全量边界复盘");
  console.log(`  max iteration：${checkMaxIterations(6, 5) ? "触发" : "未触发"}`);
  console.log(
    `  模型可修正错误：${handleToolError(new RecoverableToolError("角色名错误", "请使用 Researcher"))}`,
  );
  try {
    throw new ConfigurationError("hierarchical 模式必须有 Manager");
  } catch (error: unknown) {
    console.log(`  配置错误：${error instanceof Error ? error.message : String(error)}`);
  }
  conclusion(
    "Step 04 已串起 Process、Task、Manager、Agent Loop、AgentTools、Delegation、Subagent 和边界策略",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`错误：${message}`);
  process.exitCode = 1;
});

export {};
export default undefined;
