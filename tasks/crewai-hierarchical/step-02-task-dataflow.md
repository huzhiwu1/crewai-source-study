# Step 02 — Task 执行循环与输出数据流

> 第 2 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 CrewAI 的核心数据流：**一个任务的输出，会变成下一个任务的上下文**，最后聚合成 `CrewOutput`。

读者读完要能回答：为什么任务不能各自独立跑完就完事？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `crew.py:1561` | `_execute_tasks()` 任务循环 |
| `crew.py:1601 / 1617` | `_get_context()`：把前序输出拼成 context |
| `crew.py:1624` | `_process_task_result()` |
| `crew.py:1630` | `_create_crew_output()` 聚合 |
| `crew.py:1869` | `_get_context(task, task_outputs)` 实现 |
| `crew.py:1922` | `_create_crew_output()` 实现 |
| `task.py:809` | `_execute_core()`，产出 `TaskOutput` |

## 核心机制

1. 循环里维护 `task_outputs: list[TaskOutput]`。
2. 每个任务执行前，用 `_get_context(task, task_outputs)` 把**已完成的输出**拼成 context 字符串。
3. 任务执行完产出 `TaskOutput`（含 raw / pydantic / json_dict / agent / messages）。
4. 全部跑完，`_create_crew_output(task_outputs)` 聚合成最终 `CrewOutput`。

链路：

```
Task 1 执行 → TaskOutput 1
                  ↓ 作为 context
Task 2 执行 → TaskOutput 2
                  ↓
        _create_crew_output → CrewOutput
```

## 对照组（必做）

**对照组的朴素做法**：每个任务独立执行，结果只往一个数组里塞，下一个任务**看不到**前一个的结果。

要并排跑出来并说明：

- 朴素做法：Task 2 只能靠自己在 prompt 里重新描述上下文；Task 1 的产出白扔了
- CrewAI 做法：Task 1 的输出**自动**成为 Task 2 的 context，不需要人工搬运

再补一个对比：**context 全量拼接 vs 按引用选择**——说明 CrewAI 是"任务自己声明依赖哪些前序任务"，而不是无脑全塞（对应真实源码里 `_get_context` 只取 `task.context` 指定的那些）。

## 演示要求

- 正常：3 个任务顺序跑，打印每个任务收到的 context，能看到链条
- 正常：打印最终聚合的 `CrewOutput`
- 边界：第一个任务没有任何 context 时的行为；任务显式声明 `context=[]` 时的行为
- 两组对照并排输出

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_02_task_dataflow.py` | `python3 src/steps/step_02_task_dataflow.py` |
| TS | `.../src/steps/step-02-task-dataflow.ts` | `pnpm tsx src/steps/step-02-task-dataflow.ts` |

本步用**确定性 fake LLM**（step-03 才有真 executor，本步可用极简的"任务函数"代替执行）。

## 完成标准

- [ ] `TaskOutput` 数据结构
- [ ] 前序输出 → 下一个任务的 context，打印可见
- [ ] 最终聚合 `CrewOutput`
- [ ] 对照组说明"不传 context 会怎样"
- [ ] 区分"全量拼接"与"按声明选择 context"

## 不许做

- 不要把 context 处理写死在循环里（要像真实源码一样由任务声明）
- 不要在这一步引入工具调用
