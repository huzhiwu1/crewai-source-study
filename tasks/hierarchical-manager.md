# 任务书：CrewAI 源码精读复现（hierarchical 主线）

> 实现方（Codex）的输入规格。开工前先读仓库根 `AGENTS.md`。
> 本任务是 **v2**，v1 只有 6 步且把 Agent 执行器当黑盒，已作废。规格里没写的，不要自作主张扩。

## 目标

从 0 复现 CrewAI 的**执行链路与 hierarchical 委派机制**，重点是**对象边界与调用链**，不是"能跑起来就行"。

- Python 版：`articles/crewai-hierarchical-python/`
- TypeScript 版：`articles/crewai-hierarchical-ts/`
- 运行报告：`reports/crewai-hierarchical-python.md`、`reports/crewai-hierarchical-ts.md`

两语言**步骤编号与语义必须一致**。

## 上游源码锚点（v1.15.21 / commit a8d330de0）

路径：`source/lib/crewai/src/crewai/`

| 位置 | 是什么 |
|-|-|
| `process.py:4` | `class Process(str, Enum)`，只有 sequential / hierarchical |
| `crew.py:995` | `kickoff()`，生命周期入口 + process 分发 |
| `crew.py:1512` | `_run_sequential_process()` 直接调 `_execute_tasks` |
| `crew.py:1516` | `_run_hierarchical_process()` 先建 manager 再调**同一个** `_execute_tasks` |
| `crew.py:1521` | `_create_manager_agent()`，两条分支 |
| `crew.py:1561` | `_execute_tasks()`，真正的任务循环 |
| `crew.py:1601 / 1617` | 上下文构造 |
| `crew.py:1624 / 1630` | 任务结果处理 / 聚合 CrewOutput |
| `crew.py:1648` | `_prepare_tools()`，按 process 动态准备工具 |
| `crew.py:1717` | `_get_agent_to_use()`，hierarchical 下返回 manager |
| `crew.py:1823` | `_add_delegation_tools()` |
| `crew.py:1856` | `_update_manager_tools()` |
| `task.py:809` | `_execute_core()` |
| `agent/core.py:856` | `Agent.execute_task()` |
| `agent/core.py:1157` | `create_agent_executor()` |
| `agents/crew_agent_executor.py:230` | `invoke()` |
| `agents/crew_agent_executor.py:331` | `_invoke_loop()` 分发 |
| `agents/crew_agent_executor.py:352 / 506 / 619` | 三条循环：ReAct / native tools / native no tools |
| `agents/crew_agent_executor.py:689` | `_handle_native_tool_calls()` |
| `tools/agent_tools/agent_tools.py:16` | `class AgentTools` |
| `tools/agent_tools/delegate_work_tool.py:16` | `DelegateWorkTool` |
| `tools/agent_tools/ask_question_tool.py:14` | `AskQuestionTool` |
| `tools/agent_tools/base_agent_tools.py:46` | `BaseAgentTool._execute()` |

## 必须体现的机制

1. **process 只是开关，不复制执行循环**：sequential 与 hierarchical 最终进入**同一个** `_execute_tasks`；hierarchical 只多做一次 manager 准备。
2. **Task 数据流**：`TaskOutput` → 作为下一个 Task 的 context → 最终聚合 `CrewOutput`。
3. **Agent 定义与执行器分离**：Task 不直接调 LLM；`agent.create_agent_executor()` 把 prompt / tools / task 装进 executor。
4. **工具调用循环**：executor 识别 tool call → 执行 → 结果写回消息 → 继续推理，直到最终答案。
5. **hierarchical 的任务归属**：`_get_agent_to_use()` 在 hierarchical 下返回 manager，所以**原始 Crew Task 由 manager 执行**，coworker 执行的是**现场新建的临时 Task**。
6. **manager 两条分支**：用户自带 manager（强制 `allow_delegation=True`；带普通工具则 warning + 清空 + 抛异常）／自动创建（i18n role/goal/backstory + `AgentTools` + `manager_llm`）。
7. **同事即工具**：`AgentTools` 产出**两个**工具 —— `DelegateWorkTool` 与 `AskQuestionTool`，描述里动态写入所有 agent role。
8. **委派落地**：名字消毒（归一化空白 → 转小写 → 去引号）→ 按 role 匹配 → 现场建 `Task` → **同步调** `selected_agent.execute_task()` → 结果作为工具返回值回填。
9. **容错**：找不到 coworker 返回错误文本（含可选同事列表），不抛异常。
10. **工具是执行上下文的一部分**：工具在任务执行前按 agent + process 动态注入，不是 Agent 的静态属性。

## 渐进步骤（每步独立可跑）

- **step-01 Process seam 与共享执行循环**
  不写两个空实现。要求：`Process` 枚举 + `kickoff` 分发，**两个分支都进入同一个 `_execute_tasks`**；hierarchical 只多一步假的 `_create_manager_agent`。用 trace 输出证明两种模式共享执行器。
  验证：trace 里 sequential / hierarchical 都出现同一处 `_execute_tasks` 入口。

- **step-02 Task 执行循环与输出数据流**
  要求：顺序执行多个 Task；产出 `TaskOutput`；**前一个 Task 的输出作为后一个 Task 的 context**；最终聚合 `CrewOutput`。
  验证：打印出 context 传递链和最终聚合结果。

- **step-03 Agent 定义与 Executor 分离**
  要求：`Agent` 接收 Task → `create_agent_executor()` 装配 prompt/tools/task → executor 执行。用**确定性 fake LLM**。
  验证：能看出 Task 不碰 LLM，LLM 只在 executor 里被调用。

- **step-04 工具调用循环**
  分两小步渐进：先 ReAct 文本式（解析 Action/Action Input），再 native tool calling（结构化 tool_calls）。
  要求：工具结果回填消息后**继续调用模型**，直到最终答案。
  验证：打印完整消息序列（user → assistant tool_call → tool result → assistant final）。

- **step-05 Manager 创建与 hierarchical 任务选择**
  要求：覆盖 manager 两条分支；`_get_agent_to_use()` 在 hierarchical 下返回 manager。
  验证：自定义 manager 带工具时抛异常；hierarchical 下原始 Task 由 manager 执行。

- **step-06 AgentTools 完整工具集**
  要求：**同时**实现 `DelegateWorkTool` 和 `AskQuestionTool`；共享名字消毒与 coworker 查找。
  验证：大小写 / 空白 / 带引号的 role 都能匹配；不存在的名字返回错误文本不崩溃。

- **step-07 委派闭环**（**必须接真实 LLM**）
  完整链路：kickoff → manager 执行原始 Task → executor 产生 tool call → `DelegateWorkTool` → 现场建 Task → `selected_agent.execute_task()` → 结果回填 manager → manager 出最终结果 → `CrewOutput`。
  验证：贴出真实 LLM 的原始 tool_call 与最终输出。

- **step-08 错误、上下文与边界行为**
  覆盖：找不到 coworker；coworker 执行异常转成工具错误文本；delegate 与 ask 的语义区别；manager 无 coworker 时的行为；task context 如何进入委派任务。

- **step-09 异步与生命周期扩展**（可选）
  从 `kickoff_async` / async task / callbacks / streaming / checkpoint / event bus 里**至少选一个**实现，说明 CrewAI 如何从 demo 扩到框架级运行时。

## 环境变量（真实 LLM 用）

**全仓库共用一份 `.env`，放在仓库根目录**，两个语言版本都从这里读。不要在子目录里另建。

| 变量 | 说明 |
|-|-|
| `LLM_API_KEY` | 密钥。**只放本地 `.env`** |
| `LLM_BASE_URL` | OpenAI 兼容 base url，例如 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名，例如 `deepseek-chat` |

要求：

- 仓库根提供 `.env.example`（**只有变量名和示例值，不含真值**）
- 根 `.env` 已在 `.gitignore` 里，**严禁提交**
- 读取方式：**从当前文件向上逐级查找 `.env`**（或向上找到 `.git` 所在目录），不要硬编码 `../../.env`
- `reports/*.md` 可以写模型名和 base url 域名，**绝不能出现任何 key**

## 铁律（硬性）

1. **必须能真跑**，每步独立：
   - Python：`python3 src/steps/step_0X.py`（或 `uv run`，报告里写清）
   - TS：`pnpm tsx src/steps/step-0X.ts`（或 `npx tsx`）
2. **机制步骤用确定性 fake LLM**（step-01~06、08）；**step-07 必须接真实 LLM**。
   - fake LLM 要是可预测的固定回复，保证机制断言稳定。
   - 若某步因网络/额度跑不通，**如实贴失败输出**并说明，不要改写成假成功。
3. **不许 import `crewai` 包本身**（纯自实现），只用标准库和常规基础依赖。
4. 每步顶部注释写清：学习目标 + 对应源码锚点。
5. 终端输出用分隔线分组，关键断言打 ✅/❌，结尾一句总结。
6. `reports/*.md` 必须贴**真实终端输出**，禁止编造。

## 验收标准

1. 两语言每步都能独立跑通
2. step-02 能看到 `TaskOutput → context → CrewOutput` 的完整数据流
3. step-04 能看到完整消息序列与工具结果回填
4. step-05 证明 hierarchical 下原始 Task 由 manager 执行
5. step-06 两个工具都有，且容错路径正确
6. step-07 有**真实 LLM 的原始输出**片段
7. 两语言步骤编号、语义一一对应
8. 仓库里不提交任何 `.env`（自查：`git ls-files | grep -i env` 只能看到 `.env.example`）

## 有疑问怎么办

写 `reports/crewai-hierarchical-feedback.md`，**不要**改本文件或 `docs/`。
