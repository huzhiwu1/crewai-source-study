# Step 05 — Manager 创建与 hierarchical 任务归属

> 第 5 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 hierarchical 最反直觉的一点：**原始 Crew Task 是由 manager 执行的，不是 `task.agent` 执行的**。coworker 跑的永远是现场新建的临时 Task。

读者读完要能回答：manager 到底"是什么"，为什么它不能带普通工具？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `crew.py:1516` | `_run_hierarchical_process()` |
| `crew.py:1521` | `_create_manager_agent()` —— 两条分支 |
| `crew.py:1543` | `manager.crew = self` 绑定 |
| `crew.py:1717` | `_get_agent_to_use(task)` —— hierarchical 下返回 manager |
| `crew.py:1648` | `_prepare_tools()` —— 按 process 准备工具 |
| `crew.py:1856` | `_update_manager_tools()` |
| `crew.py:725` | `check_manager_llm()` 校验 |

## 核心机制

1. **两条分支**：
   - **用户自带 `manager_agent`**：强制 `allow_delegation = True`；若它带了普通工具 → warning + 清空 + **抛异常**（`Manager agent should not have tools`）
   - **自动创建**：从 i18n 取 role / goal / backstory，`tools=AgentTools(agents).tools()`，`allow_delegation=True`，`llm=manager_llm`
2. **任务归属**：`_get_agent_to_use()` 在 hierarchical 模式下返回 `self.manager_agent`。所以 Crew 里的每个 Task 都是 manager 在执行。
3. **manager 为什么不能带工具**：它的"行动"只能是委派。给它普通工具会破坏这个模型。
4. 创建后要做三件收尾：绑定 `manager.crew`、按需挂 cache handler、进入 `_execute_tasks`。

## 对照组（必做）

**对照组的朴素做法**：写一个确定性路由器——`if (taskIndex === 0) agentA else agentB`。代码里硬编码任务分配。

要并排跑出来并说明：

- 朴素做法：分配逻辑写死在代码里；任务描述变了要改代码；无法处理"任务之间需要协商"的情况；快，但脆
- CrewAI 做法：分配交给 manager agent，用 LLM 判断；任务改了不用动代码；但依赖模型质量，慢且不确定

**这就是 CrewAI 与 LangGraph 的核心分歧**：一个用 agent 编排，一个用代码图编排。要用输出明确点出这个取舍。

再补一个对比：**manager 带普通工具**——跑一次让它抛异常，说明为什么这个约束是必要的。

## 演示要求

- 正常：自动创建 manager，打印它的 role / goal / 是否 allow_delegation / 工具列表
- 正常：`_get_agent_to_use()` 在 sequential 与 hierarchical 下分别返回什么
- 异常：自定义 manager 带工具 → warning + 抛异常
- 异常：hierarchical 但没有 manager → 真实源码抛 `ValueError("Manager agent is required for hierarchical process.")`
- 对照组并排输出（路由器 vs manager）

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_05_manager.py` | `python3 src/steps/step_05_manager.py` |
| TS | `.../src/steps/step-05-manager.ts` | `pnpm tsx src/steps/step-05-manager.ts` |

用**确定性 fake LLM**。

## 完成标准

- [ ] `_create_manager_agent` 两条分支都实现
- [ ] manager 带普通工具时抛异常
- [ ] `_get_agent_to_use()` 在 hierarchical 下返回 manager
- [ ] 证明"原始 Task 由 manager 执行"
- [ ] 对照组点明"代码图 vs LLM 编排"的分歧

## 不许做

- 不要在这一步实现真正的委派（那是 step-06 / 07）
- 不要跳过"manager 不能带工具"这个约束
