# 精读三：Task 输出契约与护栏

源码：`task.py`、`tasks/task_output.py`、`tasks/output_format.py`、`tasks/conditional_task.py`、`tasks/llm_guardrail.py`、`tasks/hallucination_guardrail.py`。

## 任务

1. **Task 数据模型**：实现 description、expected_output、context、同步/异步标记和 `TaskOutput(raw/json/pydantic)`；对照组只返回字符串。
2. **结构化输出**：用一个 Pydantic-like 轻量校验器（或项目已有基础依赖）将 JSON 转成类型化结果；覆盖字段缺失和类型错误。
3. **Guardrail 重试**：实现一次输出校验失败后，把可修正信息回给模型并重试；对照组直接抛异常，打印两者差异。
4. **ConditionalTask**：根据前序输出决定跳过或执行，证明条件分支发生在任务编排层，不是让 LLM 自己决定是否执行。

## 验收

必须明确区分“模型生成内容”“Task 输出契约”“编排器是否继续”。不能把所有错误都吞掉；配置错误仍需快速失败。
