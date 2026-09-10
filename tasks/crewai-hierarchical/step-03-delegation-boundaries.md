# Step 03：Delegation、Subagent 与边界

高密度串联 AgentTools、Manager、Delegation、temporary Task、coworker Agent Loop 和错误边界。

实现目录：`articles/crewai-hierarchical-ts/src/steps/step-03-delegation-boundaries/`

必须覆盖：

- coworker 角色归一化和字段兼容；
- Delegate work / Ask question 两个工具；
- Manager 配置约束；
- temporary Task 和共享 Agent Loop；
- 非法 JSON、未知角色、工具失败、max iteration 和配置错误。

本步以确定性演示为主，完整真实 LLM 闭环在 Step 04 验证。
