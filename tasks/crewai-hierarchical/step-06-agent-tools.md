# Step 06 — AgentTools：同事即工具

> 第 6 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 CrewAI 最优雅的一招：**把同事包装成工具**。manager 不需要专门的"调度 API"，它只要像调工具一样调同事。

读者读完要能回答：为什么"多 agent 协同"可以用"工具调用"来统一？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `tools/agent_tools/agent_tools.py:16` | `class AgentTools` |
| `tools/agent_tools/agent_tools.py:22` | `tools()` —— 产出**两个**工具 |
| `tools/agent_tools/delegate_work_tool.py:16` | `DelegateWorkTool`（name = "Delegate work to coworker"） |
| `tools/agent_tools/ask_question_tool.py:14` | `AskQuestionTool`（name = "Ask question to coworker"） |
| `tools/agent_tools/base_agent_tools.py:15` | `BaseAgentTool`，持有 `agents: list[BaseAgent]` |
| `tools/agent_tools/base_agent_tools.py:20` | `sanitize_agent_name()` 名字消毒 |
| `tools/agent_tools/base_agent_tools.py:37` | `_get_coworker()` 兼容多种字段名 |
| `agent/core.py:1257` | `get_delegation_tools()` |

## 核心机制

1. **两个工具，不是工具列表**：`DelegateWorkTool`（派活）+ `AskQuestionTool`（提问）。语义不同：一个是交付任务，一个是向同事提问。
2. **描述动态生成**：`coworkers = ", ".join(agent.role for agent in agents)`，把花名册塞进工具描述（走 i18n 模板），模型才知道能派给谁。
3. **名字消毒**（`sanitize_agent_name`）：归一化空白（含换行）→ `casefold()` 转小写 → 去掉 `"`。真实源码注释写明原因：**弱模型会产出被截断的非法 JSON**，例如 `{"task": "...", "coworker": "...`
4. **字段名容错**（`_get_coworker`）：兼容 `coworker` / `co_worker`；若值是 `[a, b]` 形式，取第一个。
5. 两个工具共享 `BaseAgentTool._execute()`（step-07 实现）。

## 对照组（必做）

**对照组的朴素做法**：把 agent 的 role + 简介拼进 prompt，让模型输出一个字符串，然后代码里 `agents.find(a => a.role === name)` 硬匹配（区分大小写、不去空格）。

要并排跑出来并说明：

- 朴素做法：模型输出 `"Senior Researcher"`（带空格/引号/大小写差异）就匹配不上，直接崩或静默失败
- CrewAI 做法：消毒后 `senior researcher` 双向归一，容错；匹配不上时**返回错误文本给模型**，模型可以自己改名重试

再补一个对比：**把同事当"参数" vs 当"工具"**——说明后者能直接复用已有的工具调用循环（step-04），不需要新协议。这是"多 agent 协同"能被 LLM 原生能力驱动的原因。

## 演示要求

- 正常：打印两个工具的 name / description（能看到 role 列表被注入）
- 正常：`sanitize_agent_name` 一组用例——`"Senior Researcher"` / `"SENIOR   researcher"` / `"\"Writer\""` / 含换行 → 都归一
- 正常：`_get_coworker` 兼容 `coworker` / `co_worker` / `[a, b]` 三种形态
- 边界：不存在的 coworker → 返回错误文本（**不抛异常**），且错误里带可选同事列表
- 边界：`agent_name` 为 `None`
- 对照组并排输出

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_06_agent_tools.py` | `python3 src/steps/step_06_agent_tools.py` |
| TS | `.../src/steps/step-06-agent-tools.ts` | `pnpm tsx src/steps/step-06-agent-tools.ts` |

## 完成标准

- [ ] **两个**工具都实现（delegate + ask question）
- [ ] 工具描述里动态写入所有 agent role
- [ ] 名字消毒覆盖大小写 / 空白 / 引号 / 换行
- [ ] `_get_coworker` 兼容三种字段形态
- [ ] 找不到 coworker 返回错误文本、不抛异常
- [ ] 对照组说明"硬匹配"的脆弱点

## 不许做

- 不要只实现 `DelegateWorkTool` 就收工
- 不要在这一步实现真正的执行链路（`_execute` 留给 step-07）
