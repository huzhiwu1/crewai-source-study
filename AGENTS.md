# AGENTS.md — 协作约定（crewai-source-study）

这个仓库由**两方 + 一个搬运工**协作产出，本文件是协作契约，任何一方动手前先读完。

| 角色 | 在哪 | 负责什么 |
|-|-|-|
| 分析方 | 志武家里的 Mac（OpenClaw 助手） | 精读 CrewAI 源码、写机制分析、写任务书、审产出 |
| 实现方 | 公司电脑上的 Codex | 按任务书写可运行代码、跑通、贴真实输出 |
| 志武 | 两边都有 | 只做三件事：pull / 让 codex 干活 / push。不做翻译和转述 |

## 目录职责（分区写作，避免冲突）

| 目录 | 谁写 | 内容 |
|-|-|-|
| `docs/` | 分析方 | 机制分析文档（源码逐段 + `文件:行号` 锚点） |
| `tasks/` | 分析方 | 任务书，Codex 的输入规格 |
| `articles/<slug>/` | Codex | 可运行代码 + 自己的说明 |
| `reports/` | Codex | 真实运行输出（原始日志，不许美化） |
| `README.md` | 分析方 | 索引 |

**铁律：不要跨区写。** Codex 不要改 `docs/` 和 `tasks/`；分析方不改 `articles/` 和 `reports/`。跨区改动只通过任务书或 feedback 文件提出。

## Codex 干活铁律

1. **先读 `tasks/<topic>.md`**，严格按规格执行。规格里没写的，不要自作主张扩功能。
2. **代码必须真实跑通**，`reports/<slug>.md` 里贴原始输出。**禁止编造输出**。
3. 用了 mock 的地方必须显式标注。
4. 每一步要独立可跑，不能只跑得通最后一步。
5. 产出：代码落 `articles/<slug>/`，运行输出落 `reports/<slug>.md`。
6. 任务书有疑问或规格有坑 → 写 `reports/<slug>-feedback.md`，**不要**直接改任务书。

## 上游源码（不入库，需要时自拉）

```bash
# 直连，别走代理（代理慢 45 倍）
git -c http.proxy= -c https.proxy= clone https://github.com/crewAIInc/crewAI.git source
```

- 分析对象版本：**v1.15.21**，commit `a8d330de0`（2026-09-09）
- 核心代码路径：`source/lib/crewai/src/crewai/`

## 一轮循环

1. 分析方 push `tasks/<topic>.md`
2. 志武 `git pull`
3. Codex：读 `tasks/<topic>.md`，按它干活
4. 志武 commit + push
5. 分析方 pull → 审 → 出下一轮任务书

## 冲突处理

两边同时 push 会冲突。规则：**分析方只写 `docs|tasks|README`，Codex 只写 `articles|reports`**。万一冲突，以「谁的文件谁负责」为准，各自 `git pull --rebase` 后重推。
