# Step 07 — 委派闭环（真实 LLM）

> 第 7 / 9 步。总览见 [README.md](README.md)。**本步是唯一必须接真实 LLM 的一步。**

## 学习目标

把前 6 步拼起来跑通完整闭环，看清**一次多 agent 协同到底发生了什么**。

读者读完要能回答：manager 是怎么"决定"派活的？派活之后结果怎么回到 manager 手里？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `tools/agent_tools/base_agent_tools.py:46` | `BaseAgentTool._execute()` —— 委派的真正实现 |
| `tools/agent_tools/base_agent_tools.py:110` | 选中 agent |
| `tools/agent_tools/base_agent_tools.py:112` | **现场 new 一个 Task** |
| `tools/agent_tools/base_agent_tools.py:120` | **同步**调 `selected_agent.execute_task(...)` |
| `agent/core.py:856` | `Agent.execute_task()` |
| `task.py:809` | `_execute_core()` |
| `crew.py:1561` | 外层任务循环 |

## 核心机制

`_execute()` 四步（`base_agent_tools.py:46-124`）：

1. 名字消毒 + 按 role 匹配 agent
2. **现场 new 一个 Task**：
   ```
   Task(description=task, agent=selected_agent, expected_output=<i18n manager_request>)
   ```
3. **同步调用** `selected_agent.execute_task(task_with_assigned_agent, context)`
4. 返回值**直接作为工具结果**回填给调用方（manager 的 executor）

完整闭环：

```
crew.kickoff()
 → _run_hierarchical_process()
 → _create_manager_agent()
 → _execute_tasks()                        ← 外层任务循环
 → _get_agent_to_use() → manager
 → manager.execute_task(原始 Task)
 → manager 的 executor 循环
 → LLM 产出 tool_call: DelegateWorkTool
 → _execute() → 现场 new Task → coworker.execute_task()
 → coworker 的 executor 跑完，返回文本
 → 作为工具结果写回 manager 的消息
 → manager 的 executor 继续 → 最终答案
 → TaskOutput → CrewOutput
```

**注意**：coworker 跑的是**临时 Task**，不是 Crew 里那个原始 Task。这一点最容易看漏。

## 对照组（必做）

**对照组的朴素做法**：不用 LLM，直接函数调用——`const result = await agentA.run(taskDesc)`，代码里写死调用顺序。

要并排跑出来并说明：

- 朴素做法：确定性、快、可测试；但改流程要改代码，无法处理"看任务内容再决定给谁"
- CrewAI 做法：由 LLM 决定派给谁、派几次；灵活，但慢、不确定、需要真实模型

**必须打印真实 LLM 的原始 tool_call 参数**（`coworker` 字段实际是什么值），让读者看到模型真的在做分配。

再补一个对比：**同一个任务跑 3 次**，看 manager 的选择是否稳定——用真实数据说明"LLM 编排"的不确定性代价。

## 演示要求

- 正常：完整闭环跑通，每层都打点（kickoff → manager → tool_call → 临时 Task → coworker → 回填 → 最终 CrewOutput）
- 正常：打印真实 LLM 的原始 tool_call（含 `coworker` 值）与最终输出
- 正常：至少两个 coworker，构成"派给谁"的选择
- 边界：模型这次没派活、直接自己回答了
- 对照组并排输出 + 3 次重复的稳定性观察

## 环境

```bash
# 仓库根 .env
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
```

真实密钥**只放本地 `.env`**，报告里只能出现模型名和 base url 域名。

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_07_delegation.py` | `python3 src/steps/step_07_delegation.py` |
| TS | `.../src/steps/step-07-delegation.ts` | `pnpm tsx src/steps/step-07-delegation.ts` |

## 完成标准

- [ ] 完整闭环跑通，链路每层可见
- [ ] 现场 new 临时 Task（不是复用原始 Task）
- [ ] 同步调用 coworker 并把结果当工具结果回填
- [ ] 报告里有**真实 LLM 的原始输出**片段
- [ ] 对照组说明"硬编码编排"的代价
- [ ] 报告里没有任何 key

## 不许做

- 不要用 fake LLM 蒙混过关——本步的核心价值就是真实模型参与
- 跑不通就如实贴失败输出，说明是网络还是额度问题
