# 任务总览：CrewAI 执行链路与 hierarchical 委派（9 步）

> 实现方（Codex）的输入规格。开工前先读仓库根 `AGENTS.md`。
> 本目录取代旧的 `tasks/hierarchical-manager.md`（v1/v2 已作废）。
> **每一步一个独立任务文件**，按 `step-0X-*.md` 顺序做。

## 你的角色（三重身份，融合进每一行代码和注释）

1. **资深 AI Agent 工程师**：写生产级设计取舍，不只是"能跑"。代码要让人看出"为什么这么设计"。
2. **AI Agent 教学老师**：读者是**有前端经验、刚学 Agent 的初学者**。每步必须独立可跑、输出有教学价值；注释讲清"这一步解决什么问题、不这么做会怎样"。
3. **CrewAI 源码研究者**：简化实现必须忠实于真实源码的机制和命名；注释标注对应源码 `文件:行号`，不能凭空发明与源码不符的行为。

## 每步必带的「对照组」

这是本任务的**特色要求**：每一步都要在代码里放一个**对照组（naive 版）**并排跑。

- **对照组 = 最朴素、最直觉的做法**（新手第一反应会怎么写）
- **CrewAI 做法 = 真实源码的设计**
- 两者跑同一条链路，把输出并排打出来，**用注释和输出说明差在哪、代价是什么**

目的：让读者亲眼看到"为什么 CrewAI 要这么设计"，而不是只被告知结论。

对照片段用固定分节打印，例如：

```
────────── 对照组：朴素做法 ──────────
...
────────── CrewAI 做法 ──────────
...
────────── 差异 ──────────
✅ CrewAI 赢在：...
❌ 代价：...
```

## 产出目录

| 语言 | 目录 |
|-|-|
| Python | `articles/crewai-hierarchical-python/` |
| TypeScript | `articles/crewai-hierarchical-ts/` |

- 步骤文件：`src/steps/step_0X_<slug>.py` / `src/steps/step-0X-<slug>.ts`
- 两语言**步骤编号与语义必须一一对应**，方便对照阅读
- 运行报告：`reports/crewai-hierarchical-python.md`、`reports/crewai-hierarchical-ts.md`

## 步骤索引

| 步骤 | 文件 | 主题 |
|-|-|-|
| 01 | [step-01-process-seam.md](step-01-process-seam.md) | Process 开关与共享执行循环 |
| 02 | [step-02-task-dataflow.md](step-02-task-dataflow.md) | Task 执行循环与输出数据流 |
| 03 | [step-03-agent-executor.md](step-03-agent-executor.md) | Agent 定义与 Executor 分离 |
| 04 | [step-04-tool-loop.md](step-04-tool-loop.md) | 工具调用循环（ReAct → native） |
| 05 | [step-05-manager.md](step-05-manager.md) | Manager 创建与 hierarchical 任务归属 |
| 06 | [step-06-agent-tools.md](step-06-agent-tools.md) | AgentTools：同事即工具 |
| 07 | [step-07-delegation.md](step-07-delegation.md) | 委派闭环（真实 LLM） |
| 08 | [step-08-boundaries.md](step-08-boundaries.md) | 错误、上下文与边界行为 |
| 09 | [step-09-lifecycle.md](step-09-lifecycle.md) | 异步与生命周期扩展（可选） |

## 上游源码

版本 **v1.15.21**，commit `a8d330de0`。路径 `source/lib/crewai/src/crewai/`。

需要时自拉（**不入库**）：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/crewAIInc/crewAI.git source
cd source && git sparse-checkout set lib/crewai lib/crewai-core
```

## LLM 策略

| 步骤 | LLM |
|-|-|
| 01 / 02 / 03 / 04 / 05 / 06 / 08 | **确定性 fake LLM**（脚本化固定回复，保证断言稳定） |
| **07** | **必须真实 LLM** |
| 09 | 视实现而定 |

fake LLM 要求：输入可预测、输出固定、可断言。不要用随机数。

## 环境变量（真实 LLM 用）

**全仓库共用一份 `.env`，放在仓库根目录**。

| 变量 | 说明 |
|-|-|
| `LLM_API_KEY` | 密钥。**只放本地 `.env`** |
| `LLM_BASE_URL` | OpenAI 兼容 base url |
| `LLM_MODEL` | 模型名 |

- 仓库根提供 `.env.example`（只有变量名和示例，**无真值**）
- 读取方式：**从当前文件向上逐级查找 `.env`**，不要硬编码 `../../.env`
- `reports/*.md` **绝不能出现任何 key**

## 通用铁律

1. **必须能真跑**，每步独立：Python `python3 src/steps/step_0X_<slug>.py`（或 `uv run`）；TS `pnpm tsx src/steps/step-0X-<slug>.ts`（或 `npx tsx`）。跑法写进报告。
2. **不许 import `crewai` 包本身**（纯自实现），只用标准库和常规基础依赖。
3. 每个文件顶部四段式注释：**学习目标 / 对应源码 / 对照组说明 / 跑法**。
4. 终端输出：分隔线分组、关键断言 `✅`/`❌`、结尾 `🎯` 一句话总结。
5. `reports/*.md` 贴**真实终端输出**，禁止编造。跑不通就如实贴失败输出。
6. 任务书有疑问 → 写 `reports/crewai-hierarchical-feedback.md`，**不要**改 `tasks/` 或 `docs/`。

## 输出要求

1. 直接创建/修改文件，不要只给方案
2. 每步跑通后报告输出摘要（一两行）
3. 总结里说明：复现了源码哪个机制、与真实源码的差异（简化了什么）
4. 拿不准的源码行为以真实源码为准，并在总结里指出
