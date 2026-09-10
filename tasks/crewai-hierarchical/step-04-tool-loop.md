# Step 04 — 工具调用循环（ReAct → native）

> 第 4 / 9 步。总览见 [README.md](README.md)。

## 学习目标

看懂 Agent 主循环：**模型说要用工具 → 执行工具 → 结果写回消息 → 再问模型**，直到模型给出最终答案。

这是整份任务里最核心的一步。读者读完要能回答：为什么不能"一次调用 + 手写 if 判断"？

## 对应源码

| 位置 | 是什么 |
|-|-|
| `agents/crew_agent_executor.py:331` | `_invoke_loop()` —— 按能力分发 |
| `agents/crew_agent_executor.py:352` | `_invoke_loop_react()` —— 文本式 ReAct，解析 Action / Action Input |
| `agents/crew_agent_executor.py:506` | `_invoke_loop_native_tools()` —— 原生 tool calling |
| `agents/crew_agent_executor.py:619` | `_invoke_loop_native_no_tools()` —— 原生接口但无工具，单次调用 |
| `agents/crew_agent_executor.py:656` | `_is_tool_call_list()` —— 判断返回是不是 tool call |
| `agents/crew_agent_executor.py:689` | `_handle_native_tool_calls()` —— 只执行第一个 tool call，留出反思空间 |
| `agents/crew_agent_executor.py:492` | `_append_text_tool_calling_fallback_message()` —— 原生被拒后回退文本式 |
| `agents/parser.py` | 文本输出解析 |

三条路径的分发条件（真实源码）：

```
use_native_tools = llm 支持 function calling 且 有工具
use_native_tools ? _invoke_loop_native_tools() : _invoke_loop_react()
```

## 核心机制

1. **循环**：`while` 里调 LLM → 判断返回是 tool call 还是最终答案 → 是 tool call 就执行 + 回填消息 → 继续。
2. **只执行第一个 tool call**（`_handle_native_tool_calls` 的注释明确说明）：留出"反思"空间，让模型看到结果再决定下一步。批次里若有 `result_as_answer` 或 `max_usage_count` 工具则不走并行。
3. **max_iter 保护**：超过迭代上限有专门的处理函数。
4. **回退链**：原生 tool calling 失败（`is_native_tool_calling_unsupported_error`）→ 追加文本式指令 → 切到 `_invoke_loop_react()`。
5. **上下文超长处理**：`is_context_length_exceeded` → `handle_context_length` 后继续。

## 对照组（必做）

**对照组的朴素做法**：一次 LLM 调用，然后代码里 `if ('weather' in answer) { callWeather() }` 硬编码判断，调完直接返回。

要并排跑出来并说明：

- 朴素做法：模型想调两个工具做不到；工具返回错误模型不知道；模型看不到工具结果无法纠错；新增工具要改 if/else
- CrewAI 做法：循环 + 消息回填，模型能连续调用、能基于结果纠错、能自己决定何时收尾

再补一个对比：**一次执行全部 tool call vs 只执行第一个**——打印两种做法下的消息序列，说明"并行快"与"有反思"的取舍。

再补一个对比：**只有 native 路径 vs 带 ReAct 回退**——模拟一次"模型不支持 function calling"，看有没有回退的区别。

## 演示要求

- 正常：ReAct 路径跑一次完整循环，打印完整消息序列（user → assistant Action → tool result → assistant Final）
- 正常：native 路径跑一次，打印结构化 tool_call 与结果回填
- 正常：**多轮工具调用**（模型连续调两次工具才给最终答案）
- 边界：工具执行抛异常时的行为
- 边界：超过 max_iter 的行为
- 边界：native 不支持 → 回退文本式
- 对照组并排输出（至少覆盖上面第一个对比）

## 产出与跑法

| 语言 | 文件 | 跑法 |
|-|-|-|
| Python | `.../src/steps/step_04_tool_loop.py` | `python3 src/steps/step_04_tool_loop.py` |
| TS | `.../src/steps/step-04-tool-loop.ts` | `pnpm tsx src/steps/step-04-tool-loop.ts` |

用**确定性 fake LLM**：按调用次数返回脚本化回复（第 1 次返回 tool call，第 2 次返回最终答案）。

## 完成标准

- [ ] 循环实现，工具结果回填消息后**继续**调用模型
- [ ] ReAct 与 native 两条路径都有
- [ ] 只执行第一个 tool call 的语义
- [ ] max_iter 保护
- [ ] native 失败能回退到 ReAct
- [ ] 打印完整消息序列，肉眼可验
- [ ] 对照组说清"硬编码 if/else"的代价

## 不许做

- 不要在这一步引入 hierarchical / manager
- 不要用真实 LLM（用脚本化 fake，保证可断言）
