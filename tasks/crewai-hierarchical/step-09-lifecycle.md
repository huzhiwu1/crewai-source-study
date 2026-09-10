# Step 09 — 异步与生命周期扩展（可选）

> 第 9 / 9 步。总览见 [README.md](README.md)。
> **本步可选**：至少实现一个方向，说明 CrewAI 如何从 demo 扩到框架级运行时。

## 学习目标

看懂"能跑的 demo"和"能上生产的框架"之间的差距：**并发、回调、流式、持久化、事件**。

读者读完要能回答：为什么同一个任务循环要写同步和异步两套？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `crew.py:1130` | `kickoff_async()` |
| `crew.py:1369` | `_aexecute_tasks()` 异步任务循环 |
| `crew.py:1448 / 2017` | `_aprocess_async_tasks()` |
| `task.py:625` | `_execute_task_async()` |
| `task.py:609` | `execute_async()` |
| `crew.py:995-1088` | `kickoff()` 的生命周期：checkpoint 恢复、streaming、事件、before/after callback、memory drain、usage metrics |
| `crew.py:1094` | `kickoff_for_each()` |
| `crew.py:1648` | `_prepare_tools()` —— 工具按上下文动态注入 |
| `crew.py:1823 / 1856` | `_add_delegation_tools` / `_update_manager_tools` |

## 可选方向（至少做一个）

1. **异步**：把 `_execute_tasks` 改成 async 版本；任务标记 `async_execution` 时并发跑，遇到同步任务前先 drain。要说明**为什么保留两套**（同步 API 对使用者更友好，异步是给高并发场景）。
2. **回调**：`task_callback` / `step_callback` / `before_kickoff_callbacks` / `after_kickoff_callbacks`。要说明"钩子点放在哪"的设计考虑（步骤级 vs 任务级 vs 全流程级）。
3. **事件总线**：任务开始/结束/失败事件。要说明为什么用事件而不是直接调用（解耦、可观测性、可插入追踪）。
4. **流式**：中间结果边跑边出。要说明它如何与任务循环共存。
5. **工具动态注入**：复现 `_prepare_tools` 的三条路径——普通 agent 加 delegation 工具、hierarchical 更新 manager 工具、统一 `_merge_tools`。要说明**工具为什么不是 Agent 的静态属性**，而是执行上下文的一部分。

## 对照组（必做）

**对照组的朴素做法**：一个同步 `for` 循环，串行跑完所有任务，没有任何钩子。

要并排跑出来并说明：

- 朴素做法：慢（串行）、黑盒（看不到中间态）、不可恢复（崩了从头来）
- CrewAI 做法：并发可选、钩子可观测、checkpoint 可恢复

并明确点出**代价**：复杂度上升、状态管理变难、调试更难。不要说"CrewAI 更好"就完事——要给出"什么场景下朴素做法反而更合适"。

## 演示要求

- 至少一个方向完整跑通
- 对照组并排输出
- 说明该能力带来的复杂度代价

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_09_lifecycle.py` | `python3 src/steps/step_09_lifecycle.py` |
| TS | `.../src/steps/step-09-lifecycle.ts` | `pnpm tsx src/steps/step-09-lifecycle.ts` |

LLM 视实现而定。

## 完成标准

- [ ] 至少实现一个方向并跑通
- [ ] 对照组说明收益**与代价**
- [ ] 指出什么场景下朴素做法更合适

## 不许做

- 不要五个方向都浅尝辄止（选一个做透）
