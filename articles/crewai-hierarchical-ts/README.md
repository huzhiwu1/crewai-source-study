# CrewAI hierarchical：TypeScript 最小实现

在仓库根目录运行：

```bash
pnpm install
pnpm hierarchical
```

只做类型检查：

```bash
pnpm hierarchical:typecheck
```

从仓库根目录运行单个教学步骤：

```bash
pnpm hierarchical:step:01
pnpm hierarchical:step:02
pnpm hierarchical:step:03
pnpm hierarchical:step:04
```

Step 01、02、03 是高密度机制课；Step 04 是包含前面全部机制的真实 LLM 总装。

代码只保留一条教学主线：

```text
Crew → Manager → Executor → DelegateWorkTool → Coworker → 临时 Task → 回填结果
```

它不 import CrewAI、LangChain 或 LangGraph，而是用 Node 原生 `fetch` 调用真实的 OpenAI-compatible LLM。当前目录是 pnpm workspace package，根目录脚本负责统一入口。

源码对应：`crew.py` 的 hierarchical 分支、`agent/core.py:execute_task()`、`agents/crew_agent_executor.py` 的工具循环、`tools/agent_tools/base_agent_tools.py:_execute()`。
