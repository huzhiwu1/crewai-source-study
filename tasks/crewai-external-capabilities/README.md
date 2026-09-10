# 精读七：外部能力接入

源码：`tools/`、`mcp/`、`a2a/`、`skills/`、`knowledge/`、`rag/`。

## 任务

1. **Tool 边界**：实现 schema、参数规范化、执行和失败回填；对照组是把任意函数直接暴露给模型。
2. **MCP**：用 fake transport 复现 client → tool resolver → wrapper，展示远程工具如何被收敛为本地工具接口。
3. **A2A**：用两个本地 fake agent 复现请求、认证边界、任务状态和结果回传；不得声称这是完整协议实现。
4. **Skills 与 Knowledge/RAG**：分别演示“加载可复用行为规范”和“检索外部内容”，说明它们与工具调用的差异。

## 验收

至少一个能力接入必须通过统一执行循环；覆盖工具不存在、参数非法、远程超时和权限失败。所有 fake transport/mock 都要在报告中标注。
