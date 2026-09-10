# CrewAI — hierarchical 多 agent 协同（crew.py + agent_tools）机制主线笔记

> 汇总时间：2026-09-10
> 来源：上游源码 **v1.15.21**（commit `a8d330de0`，2026-09-09），路径 `lib/crewai/src/crewai/`
> 整理方式：**逐段精读源码正文**提取机制主线。注意：CrewAI 仓库**没有** dsh 那种 `.agents/notes/` 设计决策笔记（仓库根只有 `AGENTS.md` + `docs/`），所以本摘要的第一手来源是源码本身 + 代码内注释，不是设计文档。
> 对应分析：`docs/crewai-hierarchical-analysis.md`（精读一，待产出）
> 对应任务书：`tasks/crewai-hierarchical/`（9 步）

---

## 1. Process 只是开关，不复制执行循环（Process Is a Switch, Not a Strategy）

**源码**：`process.py:4`、`crew.py:995`、`crew.py:1512`、`crew.py:1516`、`crew.py:1561`

**核心决策**：`Process` 是一个 9 行的 `str, Enum`（只有 `sequential` / `hierarchical`，还留着 `# TODO: consensual = 'consensual'`）。它不含任何流程逻辑，不是策略对象。`kickoff()` 里只做 `if/elif` 分发，两条分支**最终进入同一个 `_execute_tasks`**。

**关键设计点**：
- `_run_sequential_process()` 只有一行：`return self._execute_tasks(self.tasks)`
- `_run_hierarchical_process()` 只多一行：先 `self._create_manager_agent()`，再调**同一个** `_execute_tasks`
- 任务循环只有一份，它**不知道**自己是哪个模式
- **代价**：新增第三种 process（比如注释里那个 `consensual`）只需要改分发点 + 加一个准备钩子，不用复制循环
- **对照**：朴素做法写两份 `runSequential` / `runHierarchical`，各复制一份循环——改一处忘一处

## 2. hierarchical 的任务归属：原始 Task 由 manager 执行（Task Ownership Under hierarchical）

**源码**：`crew.py:1717-1720`

**核心决策**：

```python
def _get_agent_to_use(self, task: Task) -> BaseAgent | None:
    if self.process == Process.hierarchical:
        return self.manager_agent
    return task.agent
```

hierarchical 下**所有** Crew Task 都返回 manager。也就是说：Crew 里那个原始 Task 是 manager 在跑，coworker 跑的永远是**现场新建的临时 Task**。

**关键设计点**：
- 这正是"manager 决定把活儿派给谁"的落点——它不是"先决定再执行"，而是**manager 自己在执行任务的过程中产出委派 tool call**
- sequential 下 `_get_agent_to_use` 返回 `task.agent`，所以两种模式共用循环但归属规则不同
- 读代码时最容易看漏的一点：coworker 执行的不是 Crew 里声明的那个 Task

## 3. manager 的两条分支与"禁止带工具"约束（Manager Creation Branches）

**源码**：`crew.py:1521`、`crew.py:1530-1537`、`crew.py:1543`、`crew.py:725`（`check_manager_llm`）

**核心决策**：`_create_manager_agent()` 有两条互斥分支。

**分支 A — 用户自带 `manager_agent`**：
- 强制 `allow_delegation = True`（覆盖用户设置）
- 若它带了普通工具：先 `warning` → `manager.tools = []` → **`raise Exception("Manager agent should not have tools")`**

**分支 B — 自动创建**：
- `manager_llm = create_llm(self.manager_llm)`
- 从 i18n 取 `hierarchical_manager_agent` 的 `role` / `goal` / `backstory`
- `tools=AgentTools(agents=self.agents).tools()`、`allow_delegation=True`、`llm=manager_llm`

**收尾（两条分支共用）**：`manager.crew = self`；若 `self.cache` 则 `manager.set_cache_handler(self._cache_handler)`。

**关键设计点**：
- **为什么禁止 manager 带普通工具**：manager 的"行动"只能是委派。给它工具会破坏这个模型，所以设计上宁可直接炸
- cache handler 的注释说明了一个易漏点：manager 是在"给 crew agents 挂 cache handler 的循环"之外创建的，所以要在这里补挂，否则 `cache=True` 时 manager 的工具调用不会被去重
- 对比 `_prepare_tools` 里的另一处硬约束：hierarchical 但没有 manager → `raise ValueError("Manager agent is required for hierarchical process.")`

## 4. 同事即工具：AgentTools 只产出两个工具（Coworkers as Tools）

**源码**：`tools/agent_tools/agent_tools.py:16-36`、`delegate_work_tool.py:16`、`ask_question_tool.py:14`、`agent/core.py:1257`

**核心决策**：manager 没有专门的"调度 API"。`AgentTools(agents).tools()` 把同事包装成**两个普通工具**：

- `DelegateWorkTool`（`name = "Delegate work to coworker"`）—— 派活
- `AskQuestionTool`（`name = "Ask question to coworker"`）—— 提问

**关键设计点**：
- 工具描述**动态生成**：`coworkers = ", ".join(agent.role for agent in self.agents)`，再套 i18n 模板塞进 description。等于把花名册写进工具说明，模型才知道能派给谁
- 两个工具的 `args_schema` 都是 pydantic `BaseModel`（`task`/`question` + `context` + `coworker`）
- **最大收益**：多 agent 协同**完全复用**了既有的工具调用循环，不需要新协议——LLM 的原生 tool calling 能力直接驱动了 agent 之间的协作
- 两个工具共享同一个 `BaseAgentTool._execute()`，只是语义不同

## 5. 委派落地四步（Delegation Execution）

**源码**：`tools/agent_tools/base_agent_tools.py:46-124`

**核心决策**：`_execute(agent_name, task, context)` 干四件事：

1. **名字消毒** → 匹配 agent（`casefold()` 小写 + 归一化空白 + 去引号）
2. **现场 new 一个 Task**：`Task(description=task, agent=selected_agent, expected_output=I18N_DEFAULT.slice("manager_request"))`
3. **同步调用** `selected_agent.execute_task(task_with_assigned_agent, context)`
4. 返回值**直接作为工具结果**回填给调用方

**关键设计点**：
- `sanitize_agent_name`（`:20-35`）= `" ".join(name.split())` → `replace('"', '')` → `casefold()`。源码注释写明原因：**弱模型会产出被截断的非法 JSON**，形如 `{"task": "....", "coworker": "...`，所以要容忍残缺引号
- `_get_coworker`（`:37-44`）兼容三种字段形态：`coworker` / `co_worker`；值形如 `[a, b]` 时取第一个
- 委派是**同步、递归**的：manager → tool → `agent.execute_task()`。没有并发，也没有委派链深度限制
- 每次委派都新建 Task，不复用外层 Task

## 6. 错误处理的分界线：对模型宽容，对配置严格（Two-Tier Error Policy）

**源码**：`base_agent_tools.py:88-97`、`:99-108`、`:121-124`、`crew.py:1530-1537`、`crew.py:1655-1660`

**核心决策**：错误分两类，处理方式**完全不同**。

| 类型 | 处理 | 位置 |
|-|-|-|
| LLM 可控（名字写错、coworker 执行失败） | 返回**错误文本**，不抛 | `base_agent_tools.py:99-108`、`:121-124` |
| 配置错误（缺 manager、manager 带普通工具） | **直接抛异常** | `crew.py:1655-1660`、`crew.py:1530-1537` |

**关键设计点**：
- 找不到 coworker 的错误文本里带**可选同事列表**（`coworkers="\n".join(f"- {role}")`）——等于把纠错所需信息一并给了模型，而不是只说"失败了"
- `AttributeError / ValueError` 被单独捕获（`:88-97`），同样返回文本
- coworker 执行抛异常 → 包成 `agent_tool_execution_error` 文本返回（`:121-124`），链路不断
- **对模型宽容是因为模型的错误可以自我纠正；对配置严格是因为那是我（程序员）的错误，越早炸越好**

## 7. 工具是执行上下文的一部分，不是 Agent 的静态属性（Dynamic Tool Injection）

**源码**：`crew.py:1648-1665`（`_prepare_tools`）、`crew.py:1823-1835`（`_add_delegation_tools`）、`crew.py:1856-1866`（`_update_manager_tools`）、`crew.py:1723-1740`（`_merge_tools`）

**核心决策**：工具在**任务执行前**按 `agent + process` 动态注入。

```
if agent.allow_delegation:
    if process == hierarchical:
        if manager_agent: tools = _update_manager_tools(task, tools)
        else: raise ValueError("Manager agent is required for hierarchical process.")
    elif agent:
        tools = _add_delegation_tools(task, tools)
```

**关键设计点**：
- `_update_manager_tools`（`:1856-1866`）：若 `task.agent` 存在，委派工具只注入给 `[task.agent]`；否则注入给全部 `self.agents`
- `_add_delegation_tools`（`:1823-1835`）：普通 agent 的委派对象是**除自己以外**的同事（`agent != task.agent`），且 `len(self.agents) > 1` 才注入
- `_merge_tools`（`:1723-1740`）用 `sanitize_tool_name` 去重，新工具覆盖同名旧工具
- **收益**：同一个 Agent 在不同任务里拿到的工具集可以不同；工具集合是执行上下文的一部分

## 8. 任务数据流：TaskOutput → context → CrewOutput（Task Data Flow）

**源码**：`crew.py:1561`（循环）、`crew.py:1869-1876`（`_get_context`）、`crew.py:1879-1889`（`_process_task_result`）、`crew.py:1922-1930`（`_create_crew_output`）

**核心决策**：任务不是独立跑的。每个任务执行前，`_get_context` 把前序输出拼成 context：

```python
if not task.context: return ""
return (aggregate_raw_outputs_from_task_outputs(task_outputs)
        if task.context is NOT_SPECIFIED
        else aggregate_raw_outputs_from_tasks(task.context))
```

**关键设计点**：
- **context 由任务自己声明**（`task.context`），不是无脑全塞：
  - `NOT_SPECIFIED` → 拿全部已完成输出
  - 显式给了 `context=[task1, task2]` → 只拿那两个
  - 空 → 空字符串
- `_create_crew_output`（`:1922`）：无输出抛 `ValueError("No task outputs available to create crew output.")`；用 `t.raw` 过滤有效输出；最终结果取 `valid_outputs[-1]`
- 循环还维护 `_store_execution_log`（`was_replayed` 标记）与 `futures` 异步任务

## 9. kickoff 是生命周期入口，process 分发只是中间一小段（Kickoff Lifecycle）

**源码**：`crew.py:995`、`crew.py:1040-1088`、`crew.py:1892-1920`（`_drain_memory_writes`）

**核心决策**：`kickoff()` 不只是"分发到哪个 process"。它还承担：

- `apply_checkpoint()` → checkpoint 恢复（恢复后直接 `restored.kickoff(...)` 递归返回）
- `get_env_context()`、streaming 包装（`CrewStreamingOutput` + `signal_end` / `signal_error`）
- OpenTelemetry baggage（`crew_context` = id + key）
- before/after kickoff callbacks、失败事件
- **`_drain_memory_writes()`**：必须在 `CrewKickoffCompletedEvent` 之前跑完，否则监听器（如 telemetry session）拆掉后，晚到的 `MemorySaveCompletedEvent` 会丢，留下孤儿 span

**关键设计点**：
- `_drain_memory_writes` 的注释暴露了一个真实坑：agent 通过 `agent.memory` 保存（见 `BaseAgentExecutor._save_to_memory`），只 drain `self._memory` 会漏掉在途写入。候选集是 crew memory + `self.memory` + manager memory + 每个 agent 的 memory，scope/slice 视图要拆到背后的 `Memory` 再按 `id` 去重
- 结论：**入口函数的复杂度往往就是"从 demo 到框架"的差距**

## 10. Agent 执行器：三条循环 + 只执行第一个 tool call（Executor Loops）

**源码**：`agents/crew_agent_executor.py:230`（`invoke`）、`:331`（`_invoke_loop`）、`:352`（react）、`:506`（native tools）、`:619`（native no tools）、`:656`（`_is_tool_call_list`）、`:689`（`_handle_native_tool_calls`）、`:492`（文本回退消息）

**核心决策**：

```python
use_native_tools = llm 支持 function calling 且 有工具
use_native_tools ? _invoke_loop_native_tools() : _invoke_loop_react()
```

**关键设计点**：
- **只执行第一个 tool call**：`_handle_native_tool_calls` 的 docstring 明确写 "Executes only the FIRST tool call"，目的是留出反思空间，让模型看到结果再决定下一步
- **并行例外**：批次里若含 `result_as_answer=True` 或设了 `max_usage_count` 的工具，则跳过并行执行
- **回退链**：`is_native_tool_calling_unsupported_error(e)` → `_append_text_tool_calling_fallback_message()` → `return self._invoke_loop_react()`
- 上下文超长：`is_context_length_exceeded` → `handle_context_length` → `continue`
- `max_iter` 保护走 `has_reached_max_iterations` + `handle_max_iterations_exceeded`

---

## 机制主线速览（正文候选分步）

| # | 机制 | 一句话 | 源码锚点 |
|-|-|-|-|
| 1 | Process 是开关 | 两条分支进同一个 `_execute_tasks` | `process.py:4`、`crew.py:1512/1516/1561` |
| 2 | Task 归属 | hierarchical 下原始 Task 由 manager 执行 | `crew.py:1717-1720` |
| 3 | manager 创建 | 两条分支；带普通工具直接抛异常 | `crew.py:1521-1552` |
| 4 | 同事即工具 | `AgentTools` 产出 delegate + ask 两个工具 | `agent_tools.py:16-36` |
| 5 | 委派落地 | 消毒 → 匹配 → 现场建 Task → 同步执行 | `base_agent_tools.py:46-124` |
| 6 | 错误分界线 | 对模型宽容（回文本），对配置严格（抛异常） | `base_agent_tools.py:88-124`、`crew.py:1655-1660` |
| 7 | 工具动态注入 | 工具是执行上下文，不是静态属性 | `crew.py:1648-1665/1823/1856` |
| 8 | 任务数据流 | TaskOutput → context → CrewOutput，context 由任务声明 | `crew.py:1869-1876/1922` |
| 9 | kickoff 生命周期 | 入口承担恢复/流式/事件/回调/memory drain | `crew.py:995/1040-1088/1892-1920` |
| 10 | 执行器三循环 | native / ReAct / no-tools + 只执行第一个 tool call | `crew_agent_executor.py:331/352/506/619/689` |

### 与真实源码的已知差异（复现时简化）

- 复现**不实现** pydantic 校验、i18n 模板、OpenTelemetry、事件总线、cache handler、checkpoint 恢复
- 复现用 fake LLM（step-01~06、08）把"模型输出"写成确定性回复；只有 step-07 用真实 LLM
- 真实源码的 `Task` 是 1566 行的 pydantic 模型，复现会大幅裁剪，只保留 `description / agent / context / expected_output / output`

### 待核实 / 存疑

- `_prepare_tools` 中 `elif agent:` 分支的实际触发条件，需要再读 `_prepare_tools` 完整实现确认（当前只读了 `:1648-1670`）
- `_handle_native_tool_calls` 的并行路径细节（`max_usage_count` 的语义）未细读
