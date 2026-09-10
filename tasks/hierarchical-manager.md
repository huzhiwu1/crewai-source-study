# 任务书：hierarchical manager（多 agent 协同）

> 实现方（Codex）的输入规格。开工前先读仓库根 `AGENTS.md`。
> 规格里没写的，不要自作主张扩。

## 目标

从 0 复现 CrewAI 的 **hierarchical 流程**核心机制。**两种语言各一份**，每一步都要独立可跑。

- Python 版：`articles/hierarchical-manager-python/`
- TypeScript 版：`articles/hierarchical-manager-ts/`
- 运行报告：`reports/hierarchical-manager-python.md`、`reports/hierarchical-manager-ts.md`

代码语言不同，**步骤编号与语义必须一致**，方便对照。

## 上游源码锚点（v1.15.21 / commit a8d330de0）

路径：`source/lib/crewai/src/crewai/`

| 位置 | 是什么 |
|-|-|
| `process.py:4` | `Process` 枚举：sequential / hierarchical |
| `crew.py:1512` | `_run_sequential_process()` |
| `crew.py:1516` | `_run_hierarchical_process()` |
| `crew.py:1521` | `_create_manager_agent()` |
| `crew.py:1561` | `_execute_tasks()` |
| `tools/agent_tools/agent_tools.py:16` | `class AgentTools` |
| `tools/agent_tools/delegate_work_tool.py:16` | `class DelegateWorkTool` |
| `tools/agent_tools/base_agent_tools.py:46` | `BaseAgentTool._execute()` |
| `agent/core.py:1257` | `get_delegation_tools()` |

## 必须体现的 5 个机制

1. **process 是开关**：sequential 与 hierarchical 复用**同一条** `_execute_tasks`，差别只在于有没有先造 manager。
2. **manager 禁止带普通工具**：若 manager 带了 tools，真实源码会 warning 后清空并**抛异常**（`crew.py`）。
3. **同事即工具**：`AgentTools(agents).tools()` 只产出两个工具 —— `DelegateWorkTool`（委派）和 `AskQuestionTool`（提问），工具描述里动态填入所有 agent 的 role。
4. **委派落地四步**（`base_agent_tools.py:46-124`）：
   - 名字消毒：归一化空白 → 转小写 → 去引号（真实源码注释说明是为了兜住弱模型的非法 JSON）
   - 按 role 大小写不敏感匹配 agent
   - **现场 new 一个 Task**（`description=task`、`agent=选中的人`、`expected_output` 走 i18n）
   - **同步调用** `selected_agent.execute_task(...)`
5. **容错**：找不到 coworker 时返回错误文本（含可选同事列表），**不抛异常**，把纠错机会留给模型。

## 渐进步骤（每步独立可跑）

- **step-01 最小骨架**：`Process` 枚举 + `kickoff()` 分发到两个空实现。验证：两种模式各自打印不同分支。
- **step-02 顺序执行**：`_execute_tasks` 串起 2 个任务，agent 直接执行。验证：能看到两个任务的输出依次出现。
- **step-03 manager 创建**：实现 `_create_manager_agent`，含「manager 带工具就抛异常」的约束。验证：正常创建通过；故意给 manager 塞工具时抛异常。
- **step-04 同事即工具**：实现 `AgentTools` 与 `DelegateWorkTool`，含名字消毒 + role 匹配。验证：大小写/空格/带引号的 role 都能匹配上；给一个不存在的名字时返回错误文本不崩溃。
- **step-05 委派闭环**：`_execute` 现场造 Task → 调目标 agent 执行 → 结果回填给调用方。验证：完整链路 kickoff → manager 决策 → delegate → 目标 agent 执行 → 结果回填 → 最终输出。
- **step-06 完整版**：整合前 5 步 + 容错路径。验证：正常链路 + 找不到 coworker 两条路径都跑出预期结果。

## 环境变量（真实 LLM 用）

**全仓库共用一份 `.env`，放在仓库根目录**，两个语言版本都从这里读。不要在子目录里另建。

| 变量 | 说明 |
|-|-|
| `LLM_API_KEY` | 密钥。**只放本地 `.env`** |
| `LLM_BASE_URL` | OpenAI 兼容 base url，例如 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名，例如 `deepseek-chat` |

要求：

- 仓库根提供 `.env.example`（**只有变量名和示例值，不含真值**）
- 根 `.env` 已在 `.gitignore` 里，**严禁提交**
- 读取方式：**从当前文件向上逐级查找 `.env`**（或向上找到 `.git` 所在目录），不要硬编码 `../../.env` 这种固定层级——脚本可能在子目录里跑
- `reports/*.md` 可以写模型名和 base url 域名，**绝不能出现任何 key**

## 铁律（硬性）

1. **必须能真跑**，每步独立：
   - Python：`python3 src/steps/step_0X.py`（或用 `uv run`，二者之一，报告里写清）
   - TS：`pnpm tsx src/steps/step-0X.ts`（或 `npx tsx`）
2. **step-05 / step-06 必须接真实 LLM 跑通**，把真实输出贴进 reports。step-01~04 是纯机制（枚举分发、任务串联、manager 创建、名字消毒与匹配），**不需要 LLM**，用确定性代码即可。
   - 真实 LLM 只负责一件事：**manager 决定把任务派给谁**（产出 tool call）。
   - 若某个 step 因为网络/额度跑不通，**如实贴失败输出**并说明原因，不要改写成假成功。
3. **不许 import `crewai` 包本身**（纯自实现），只用标准库和常规基础依赖。
4. 每一步顶部注释写清：学习目标 + 对应源码锚点。
5. 终端输出用分隔线分组，关键断言打 ✅/❌，结尾一句总结。
6. `reports/*.md` 必须贴**真实终端输出**，禁止编造。跑失败就贴失败输出 + 说明。

## 验收标准

1. 两个语言版本每步都能独立跑通
2. step-05 完整演示委派闭环，**且真实 LLM 参与决策**
3. step-06 演示「找不到 coworker」返回错误文本而不崩溃
4. 两语言步骤编号、语义一一对应
5. reports 是真实输出（含真实 LLM 的原始回复片段）
6. 仓库里不提交任何 `.env`（自查：`git ls-files | grep -i env` 只能看到 `.env.example`）

## 有疑问怎么办

写 `reports/hierarchical-manager-feedback.md`，**不要**改本文件或 `docs/`。
