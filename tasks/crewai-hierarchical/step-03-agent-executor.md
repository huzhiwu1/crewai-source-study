# Step 03 — Agent 定义与 Executor 分离

> 第 3 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 CrewAI 的分层：**Task 不碰 LLM，Agent 是定义，Executor 才是执行**。

读者读完要能回答：为什么不能让 Task 直接调 LLM？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `task.py:809` | `_execute_core()` —— Task 侧只负责装配与产出 `TaskOutput` |
| `agent/core.py:856` | `Agent.execute_task()` —— 准备 prompt、事件、超时，然后交给 executor |
| `agent/core.py:1114` | `_build_execution_prompt()` 拼 prompt |
| `agent/core.py:1157` | `create_agent_executor()` —— 装配 llm / task / tools / prompt / stop_words / max_iter |
| `agent/core.py:1210` | `_update_executor_parameters()` —— **复用**已有 executor，不重建 |
| `agents/crew_agent_executor.py:230` | `CrewAgentExecutor.invoke()` —— 真正的执行入口 |
| `agents/crew_agent_executor.py:143` | `__init__`，看它持有哪些字段 |

## 核心机制

1. **三层职责**：Task（装配上下文、产出 TaskOutput）→ Agent（准备 prompt、持有 executor）→ Executor（调 LLM、维护消息与迭代）。
2. `create_agent_executor()` 一次性把 `llm / task / agent / crew / tools / prompt / original_tools / stop_words / max_iter / tools_handler / response_model` 装进 executor。
3. 第二次执行同一个 Agent 时走 `_update_executor_parameters()`：**复用 executor 实例，只更新字段**（这里有个设计取舍：省去重建成本，但状态要小心重置）。
4. Executor 自己维护 `messages` 和 `iterations`。

## 对照组（必做）

**对照组的朴素做法**：写一个 `class Task { run() { return llm.chat(this.description) } }`——Task 里直接 new LLM 并调用。

要并排跑出来并说明：

- 朴素做法：换模型要改 Task；加工具要改 Task；想复用消息历史没地方放；Task 变成万能类
- CrewAI 做法：Task 不知道 LLM 存在；换模型只动 Agent；加工具只动 executor 装配；消息与迭代次数归 executor

再补一个对比：**每次重建 executor vs 复用更新**——打印两种做法下 executor 的实例 id，说明复用省了什么、风险在哪。

## 演示要求

- 正常：Task → Agent → Executor 一路打点，输出每个环节的职责边界
- 正常：打印 executor 的实例 id，第二次执行时证明是**同一个实例**（`_update_executor_parameters` 路径）
- 边界：Agent 未解析 LLM 就执行时的报错（真实源码抛 `RuntimeError`）
- 两组对照并排输出

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_03_agent_executor.py` | `python3 src/steps/step_03_agent_executor.py` |
| TS | `.../src/steps/step-03-agent-executor.ts` | `pnpm tsx src/steps/step-03-agent-executor.ts` |

用**确定性 fake LLM**：输入相同返回相同，方便断言。

## 完成标准

- [ ] Task / Agent / Executor 三层分离，职责清晰
- [ ] `create_agent_executor()` 装配全部字段
- [ ] 第二次执行走复用路径，实例 id 相同
- [ ] executor 自己维护 messages / iterations
- [ ] 对照组说明"Task 直连 LLM"的代价

## 不许做

- 不要让 Task import 任何 LLM 类型
- 不要在这一步引入工具调用循环（那是 step-04）
