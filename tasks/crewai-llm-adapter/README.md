# 精读四：LLM 适配层

源码：`llms/base_llm.py`、`llms/providers/`、`llms/hooks/`、`llms/cache.py`、`llms/_finish_reason_utils.py`、`llm.py`。

## 任务

1. **统一接口**：实现一个最小 `BaseLLM`，把两个真实或可访问的 provider 响应适配为统一 response；无法访问第二 provider 时，用 fake provider 补充并说明原因。
2. **能力分流**：根据是否支持原生 tool calling 选择 native 或 ReAct，并保留无工具调用路径；对照组是在业务代码里写 provider `if/else`。
3. **结束原因与错误**：归一化 stop、length、tool_call 和未知 finish reason；区分 provider 错误、模型拒绝和框架解析错误。
4. **hook 与 cache**：实现调用前后 hook 和确定性缓存，展示缓存命中时哪些执行被跳过、哪些观测仍应保留。

## 验收

至少两个 provider 形态共用同一执行器，主路径必须包含真实 LLM 调用；代码中不得出现面向 provider 的业务分支。报告写清适配器隔离的是“变化”，不是把所有差异抹平。
