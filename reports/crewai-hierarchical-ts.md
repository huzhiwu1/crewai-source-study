# CrewAI hierarchical TypeScript 运行报告

日期：2026-09-10

## 根目录命令

```bash
pnpm hierarchical
```

退出码：0

## 本次真实输出中的关键原始日志

```text
── B. CrewAI 思路：hierarchical Manager ──
  [执行器] Manager 工具：Delegate work to coworker, Ask question to coworker
  [执行器] 第 1 轮开始
  [执行器] tool_calls 数量：1
  [执行器] 工具列表：Ask question to coworker
  [工具] 已向同事提问：Researcher
  [调用链] 已为 Researcher 创建临时 Task（temporary=true）
  [调用链] 原始 Task 与 temporary Task 是否为不同对象：true
  [调用链] Researcher 开始自己的 Agent Loop
  [执行器] Researcher Agent Loop 完成，结果长度：2778 字符
  [执行器] 第 2 轮开始
  [执行器] 结束，原因：LLM 返回文本
```

本次模型实际选择了 `Ask question to coworker`，没有选择 `Delegate work to coworker`；这仍然验证了 AgentTools、coworker 选择、temporary Task、子 Agent Loop 和 tool result 回填。模型是否选择哪个协作工具属于真实 LLM 的不确定行为。

## 其他已验证命令

```text
pnpm check                 → 退出码 0
pnpm hierarchical:step:01 → 退出码 0
pnpm hierarchical:step:02 → 退出码 0，多 tool_calls 数量：2
pnpm hierarchical:step:03 → 退出码 0，Delegation、Subagent、边界均有输出
pnpm hierarchical:step:04 → 本次真实运行在对照组第二次 LLM 请求遇到 HTTP 429（insufficient_quota），未进入 hierarchical 主路径；这是外部额度问题，不伪造成功输出。
```

Step 02 的真实日志确认两个 calculator 调用都被执行，结果为 `336` 和 `9801`，并按原始顺序回填。
