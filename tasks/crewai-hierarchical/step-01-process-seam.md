# Step 01 — Process 开关与共享执行循环

> 第 1 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 CrewAI 最反直觉的一个设计：**`process` 不是"两套流程"，只是一个开关**。sequential 和 hierarchical 最终进入**同一个任务执行循环**，后者只多做一次 manager 准备。

读者读完要能回答：为什么不能把 sequential 和 hierarchical 写成两个独立函数？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `process.py:4` | `class Process(str, Enum)`，全文 9 行，只有 sequential / hierarchical |
| `crew.py:995` | `kickoff()`，生命周期入口 + 分发 |
| `crew.py:1512` | `_run_sequential_process()` → 直接 `return self._execute_tasks(self.tasks)` |
| `crew.py:1516` | `_run_hierarchical_process()` → `self._create_manager_agent()` 然后**同一个** `_execute_tasks` |
| `crew.py:1561` | `_execute_tasks()`，任务循环本体 |

## 核心机制

1. `Process` 是纯枚举，不含任何流程逻辑（不是策略对象）。
2. `kickoff()` 里只有一个 `if/elif` 分发。
3. 两条分支的差别**只有一行**：hierarchical 多调一次 `_create_manager_agent()`。
4. 任务循环只有一份，`_execute_tasks` 不知道自己是哪个模式。

## 对照组（必做）

**对照组的朴素做法**：写两个独立函数 `runSequential()` 和 `runHierarchical()`，各自复制一份任务循环，只是第二个多插一个造 manager 的步骤。

要并排跑出来并说明：

- 朴素做法：任务循环代码出现两份，改一处必须记得改另一处；新增第三种 process 要再复制一份
- CrewAI 做法：循环只有一份，新增模式只改分发点 + 一个准备钩子

再用 trace 输出证明两种模式**都进入同一个执行器**（打印同一个函数名的调用记录）。

## 演示要求

- 正常：sequential 跑一遍、hierarchical 跑一遍，trace 里都能看到同一处 `_execute_tasks` 入口
- 边界：把 process 设成非法值时的行为
- 必须打印「朴素做法」与「CrewAI 做法」两组输出并对比

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `articles/crewai-hierarchical-python/src/steps/step_01_process_seam.py` | `python3 src/steps/step_01_process_seam.py` |
| TS | `articles/crewai-hierarchical-ts/src/steps/step-01-process-seam.ts` | `pnpm tsx src/steps/step-01-process-seam.ts` |

本步不需要 LLM。

## 完成标准

- [ ] `Process` 枚举 + `kickoff` 分发
- [ ] **两个分支进入同一个 `_execute_tasks` 函数**（不是两份）
- [ ] hierarchical 只比 sequential 多一次 `_create_manager_agent`（本步可为假实现）
- [ ] 对照组并排输出，差异说清
- [ ] trace 能证明共享执行器

## 不许做

- 不要把 sequential / hierarchical 写成两套独立的任务循环
- 不要在这一步引入 manager 的真实逻辑（那是 step-05）
