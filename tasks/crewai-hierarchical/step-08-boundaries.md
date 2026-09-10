# Step 08 — 错误、上下文与边界行为

> 第 8 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 CrewAI 的防御性设计：**在 LLM 参与的系统里，"出错"是常态，所以错误要变成模型的输入，而不是异常。**

读者读完要能回答：为什么这里的容错不是抛异常？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `base_agent_tools.py:88-97` | `AttributeError / ValueError` → 返回错误文本 |
| `base_agent_tools.py:99-108` | 找不到 coworker → 返回错误文本（**含可选同事列表**） |
| `base_agent_tools.py:121-124` | coworker 执行异常 → 转成 `agent_tool_execution_error` 文本 |
| `crew.py:1655-1660` | hierarchical 但没 manager → 抛 `ValueError` |
| `crew.py:1530-1537` | 自定义 manager 带工具 → warning + 清空 + `raise Exception` |
| `crew.py:1561` + `1869` | context 如何进入任务 |
| `crew.py:1632` | `_handle_conditional_task` 分支 |

## 核心机制

**两类错误的处理方式完全不同**：

| 类型 | 处理 | 原因 |
|-|-|-|
| LLM 可控的错误（名字写错、执行失败） | 返回**错误文本**，不抛 | 模型能看到错误并自我纠正 |
| 配置错误（缺 manager、manager 带工具） | **直接抛异常** | 这是程序员的问题，越早炸越好 |

这是很关键的区分：**对模型宽容，对配置严格**。

另外：返回的错误文本里带**可选同事列表**，等于给了模型纠正所需的信息，而不是只说"失败了"。

## 对照组（必做）

**对照组的朴素做法**：所有错误一律 `throw new Error(...)`。

要并排跑出来并说明：

- 朴素做法：模型名字写错一点 → 整个流程崩掉 → 用户看到 stack trace
- CrewAI 做法：名字写错 → 返回"找不到 xxx，可选：a, b, c" → 模型下一轮自己改对 → 流程继续

再补一个反向对比：**配置错误也不抛**（一路返回错误文本）——说明"对配置严格"为什么必要：缺 manager 这种问题如果静默降级，会变成难查的脏数据。

## 演示要求

- 正常：coworker 名字写错 → 返回错误文本，含可选项 → 模型/调用方可以用它纠正
- 正常：coworker 内部执行抛异常 → 转成工具错误文本，链路不断
- 正常：`agent_name` 为 `None` / 空字符串
- 正常：任务声明 `context` 指向的具体前序任务
- 异常：hierarchical 缺 manager → 抛 `ValueError`
- 异常：manager 带工具 → 抛 `Exception`
- 对照组并排输出，点明"宽容 vs 严格"的分界线

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_08_boundaries.py` | `python3 src/steps/step_08_boundaries.py` |
| TS | `.../src/steps/step-08-boundaries.ts` | `pnpm tsx src/steps/step-08-boundaries.ts` |

用**确定性 fake LLM**。

## 完成标准

- [ ] LLM 可控错误 → 错误文本（不抛）
- [ ] 配置错误 → 抛异常
- [ ] 错误文本里带可选同事列表
- [ ] coworker 执行异常被转成工具错误
- [ ] 对照组点明"宽容 vs 严格"的分界

## 不许做

- 不要把所有错误都抛异常，也不要全部都吞掉
- 不要在这一步改 step-06 / 07 的公共代码（新增文件，不要回头改）
