# 精读五：统一记忆与 RAG 边界

源码：`memory/unified_memory.py`、`analyze.py`、`recall_flow.py`、`encoding_flow.py`、`memory_scope.py`、`memory/storage/`，以及 `knowledge/`、`rag/`。

## 任务

1. **最小记忆闭环**：实现写入、分析、编码、存储、召回；分析和召回决策使用真实 LLM，存储可使用显式标注的内存 mock。
2. **作用域**：区分 crew、task、user/session 三种 scope，证明同一条记忆不会跨 scope 泄漏；对照组是一个全局字典。
3. **召回与上下文预算**：实现按相关性召回并限制 token/字符预算，打印被丢弃的记忆及原因。
4. **Memory 与 Knowledge/RAG 对照**：用同一问题演示“运行经验记忆”和“外部知识检索”不是同一个抽象。

## 验收

必须覆盖空库、重复写入、scope 不匹配和存储失败。报告说明 LLM 负责哪些分析，存储后端负责哪些确定性操作。
