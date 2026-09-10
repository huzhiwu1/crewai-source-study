# CrewAI 源码学习任务总纲

目标：完成全部任务后，读者能够从 `kickoff()` 画出 CrewAI 的运行时调用链，独立解释关键设计取舍，并把这些取舍迁移到自己的 Agent 系统。

源码基线：`/home/administrator/projects/crewAI`，v1.15.21，commit `a8d330de0`。行号只作定位提示；实现前必须以该目录中的类名和方法为准。

## 完成顺序

每个知识域按“最小骨架 → 单一能力 → 完整闭环 → 边界与对照”推进。域内任务必须逐个独立运行；完成一个域后再进入下一个。

| 阶段 | 任务目录                                                               | 必须掌握的设计问题                                                     |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1    | [crewai-hierarchical](crewai-hierarchical/README.md)                   | Crew、Task、Agent、Executor 如何组成一次执行；LLM 编排与代码编排的边界 |
| 2    | [crewai-flow](crewai-flow/README.md)                                   | 如何用确定性节点、状态和转移包住 Agent 自主性                          |
| 3    | [crewai-task-contract](crewai-task-contract/README.md)                 | 输出契约、guardrail、条件任务如何把不确定结果变成可消费数据            |
| 4    | [crewai-llm-adapter](crewai-llm-adapter/README.md)                     | 多 provider 参数和返回值如何收敛到统一接口                             |
| 5    | [crewai-memory](crewai-memory/README.md)                               | 记忆的作用域、编码、召回和可插拔存储如何分层                           |
| 6    | [crewai-observability](crewai-observability/README.md)                 | 事件、hook、state、telemetry 如何解耦观测与执行                        |
| 7    | [crewai-external-capabilities](crewai-external-capabilities/README.md) | tools、MCP、A2A、Skills、Knowledge/RAG 如何成为外部能力边界            |
| 8    | [crewai-runtime](crewai-runtime/README.md)                             | kickoff 生命周期、异步、streaming、checkpoint 和恢复如何组合           |
| 9    | [crewai-capstone](crewai-capstone/README.md)                           | 从零设计一个有确定性边界、可恢复、可观测的 Agent 系统                  |

## 每个任务的交付契约

1. 代码只写 `articles/<slug>/`，原始终端输出只写 `reports/<slug>.md`。
2. 不得 import `crewai` 来“证明”机制；凡是涉及模型决策的任务必须调用真实 LLM。fake LLM 只能作为离线回归测试。
3. 每一步只实现 TypeScript 版本；不要为了语言对称复制样板。
4. 每一步必须打印：调用链或状态变化、源码事实、教学简化、工程推论、对照组的收益与代价。
5. 每一步必须覆盖一个正常路径和一个边界路径，并在报告中贴真实输出；失败也要贴原始失败输出。
6. 任何 mock、fake LLM、内存存储、伪 provider 都必须在代码和报告中显式标注；真实 LLM 的 key、完整敏感 prompt 和业务数据不得写入报告。

## 真实 LLM 统一约定

使用仓库根 `.env` 中的 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`，通过 OpenAI-compatible HTTP 接口调用。报告打印模型名、请求次数、脱敏后的 tool call/finish reason 和最终结果，不打印 key。

真实 LLM 输出具有不确定性，因此只断言协议、状态转移、工具参数结构、错误边界和结果类型，不断言固定措辞。provider 失败时贴原始失败输出，并补跑 fake LLM 回归路径。7. 任务完成标准必须能通过输出或断言验收，不能只写“读懂源码”。

## 总结验收

最终 capstone 必须同时回答：

- 哪些决策交给 LLM，哪些决策必须由 TypeScript/状态机控制？
- Crew 与 Flow 的边界是什么？什么时候用简单 `for` 循环更好？
- 工具、委派、记忆、输出校验失败时，哪些错误应回给模型，哪些错误应立即抛出？
- 适配层、事件总线、checkpoint 等抽象分别隔离了什么变化？代价是什么？
- 如果删掉某个抽象，最先坏掉的可测试性、可观测性或恢复能力是什么？
