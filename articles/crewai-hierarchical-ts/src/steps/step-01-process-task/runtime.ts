/**
 * step-01-process-task/types.ts
 *
 * 学习目标：理解 Process、Task 作为数据结构和执行契约，不直接调用 LLM。
 *
 * 对应源码（CrewAI v1.15.21）：
 * - process.py:4（Process 枚举）
 * - crew.py:1512-1519（_run_sequential/_run_hierarchical 都进入 _execute_tasks）
 * - task.py（Task 是数据和执行契约）
 *
 * 本步可以不调用 LLM。
 */

import { Agent, Task as BaseTask, Process } from "../../shared/types.js";

/** 简化的执行结果 */
export interface TaskResult {
  taskDescription: string;
  agentRole: string;
  output: string;
  isTemporary: boolean;
}

/**
 * 简化 Crew：只管理 Task 列表和执行过程。
 * 对应 crew.py:164（Crew 类）的核心职责：编排 Task、区分 Process、共享执行循环。
 */
export class Crew {
  constructor(
    readonly tasks: BaseTask[],
    readonly processType: Process | string,
    readonly manager?: Agent,
  ) {}

  /** 模拟 executor 回调 */
  agentRunner?: (agent: Agent, task: BaseTask) => Promise<string>;

  async kickoff(): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    if (this.processType === "hierarchical") {
      console.log("  [Crew] hierarchical 模式：创建 Manager，由 Manager 执行原始 Task");
    } else {
      console.log("  [Crew] sequential 模式：按 Task 顺序执行");
    }
    for (const task of this.tasks) {
      if (!this.agentRunner) {
        throw new Error("agentRunner 未设置");
      }
      const executingAgent =
        this.processType === Process.Hierarchical && this.manager ? this.manager : task.agent;
      const output = await this.agentRunner(executingAgent, task);
      results.push({
        taskDescription: task.description.slice(0, 40),
        agentRole: executingAgent.role,
        output,
        isTemporary: task.temporary,
      });
    }
    // 关键教学点：sequential 和 hierarchical 最终都进入共享任务循环
    console.log(`  [Crew] ${this.processType} 流程完成，共执行 ${results.length} 个 Task`);
    return results;
  }
}

export {};

export default undefined;
