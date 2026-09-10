# Step 02：Agent Loop

## 学习目标

先掌握 Agent 的心脏，再理解委派。DelegationTool 不是新循环，它只是后续接入这个循环的一个 Tool。

## 源码锚点

- agent/core.py:856：Agent.execute_task()
- agent/core.py:1157：create_agent_executor()
- agents/crew_agent_executor.py:230：invoke()
- agents/crew_agent_executor.py:331：_invoke_loop()
- agents/crew_agent_executor.py:506：native tools
- agents/crew_agent_executor.py:619：native no-tools
- agents/crew_agent_executor.py:689：native tool calls 处理

## 实现

用真实 LLM 实现 Agent → Executor → LLM：

1. 构造 messages 和工具 schema。
2. LLM 返回文本时结束。
3. LLM 返回多个 tool_calls 时全部执行。
4. 工具可以并行执行，但 tool 消息按模型返回顺序回填。
5. assistant 消息保留完整 tool_calls。
6. 每条 tool 消息带对应 tool_call_id。
7. 回填后继续请求 LLM，直到没有工具调用。
8. 设置 max iteration。

## 对照组

实现 naiveExecutor，只执行 toolCalls[0]。用两个真实 tool call 展示第二个调用被静默丢失。

## 产出与验收

目录：articles/crewai-hierarchical-ts/src/steps/step-02-agent-loop/
报告：reports/crewai-hierarchical-ts-step-02.md

- [ ] 真实 LLM 主路径跑通
- [ ] 多个 tool_calls 全部执行
- [ ] 结果按原始顺序回填
- [ ] max iteration 和未知工具有边界输出
