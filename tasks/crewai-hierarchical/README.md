# CrewAI hierarchical：源码机制渐进复现任务

本专题只实现 TypeScript，目标不是复刻 CrewAI API，而是看清 CrewAI hierarchical 的设计思想：

    Agent Loop → Agent Tool → Agent/Subagent → Manager 编排

源码基线：/home/administrator/projects/crewAI，v1.15.21，commit a8d330de0。

## 学习顺序

| 步骤 | 任务                                              | 先解决的问题                             |
| ---- | ------------------------------------------------- | ---------------------------------------- |
| 01   | [Process 与 Task 数据流](step-01-process-task.md) | Crew、Process、Task、Manager 与任务归属  |
| 02   | [Agent Loop](step-02-agent-loop.md)               | LLM、工具、多轮消息和多工具调用闭环      |
| 03   | AgentTools、Delegation、Subagent 与边界           | coworker 接入、临时 Task、错误分类和预算 |
| 04   | [完整总装](step-04-complete-assembly.md)          | 真实 LLM 串起 01、02、03 的全部机制      |

## 统一要求

- 只写 articles/crewai-hierarchical-ts/ 和 reports/。
- 不修改 docs/、tasks/；实现代码只写 articles/，真实报告只写 reports/。
- 不 import crewai、LangChain 或 LangGraph。
- 使用 TypeScript、Node 原生 fetch、dotenv。
- 涉及模型决策的步骤必须调用真实 LLM；fake LLM 只能用于离线回归。
- 代码标识符使用英文；日志、注释、system prompt 和教学说明使用中文。
- 根目录运行 pnpm hierarchical。
- 每个公开步骤都要有 naive 对照组：先打印事故，再打印 CrewAI 风格实现，最后说明收益和代价。
- Step 07 必须全量复用前面机制，不能复制实现。
- 每个公开步骤都必须有真实运行报告，不得编造，不打印 API key。

## 设计重点

DelegationTool 不是独立的调度引擎，而是 AgentTools 生成的普通工具。它把 coworker 接入已经存在的 Agent Loop：

    LLM tool_call → Tool 执行 → coworker.executeTask → tool result 回填 → LLM 继续推理

Manager 和 coworker 必须复用同一套 Agent Loop；差异只来自角色、Task、工具和上下文。
