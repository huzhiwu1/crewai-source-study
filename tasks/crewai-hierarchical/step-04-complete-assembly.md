# Step 04：完整总装

使用真实 LLM 把 Step 01、02、03 的全部机制串成一次 hierarchical 执行。

调用链必须清晰可见：

```text
Process.Hierarchical
→ Crew.kickoff
→ createManager
→ Manager Agent Loop
→ AgentTools
→ temporary Task
→ coworker Agent Loop
→ tool result 回填
→ 边界策略
→ Manager 汇总
```

实现目录：`articles/crewai-hierarchical-ts/src/steps/step-04-complete-assembly/`

同时保留固定代码编排对照组，并说明 LLM 决策与 TypeScript 确定性控制的边界。
