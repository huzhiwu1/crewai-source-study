# 精读六：事件总线、hooks、state 与 telemetry

源码：`events/`、`hooks/`、`state/`、`telemetry/`，并追踪至少一个事件的发布者、监听者、状态记录者和恢复入口。

## 任务

1. **事件总线**：实现 task started/completed/failed 事件和两个独立 listener；对照组由执行器直接调用日志函数。
2. **Hook 分层**：实现 step、task、kickoff 三个 hook 点，展示执行顺序和异常策略。
3. **运行状态**：记录当前任务、迭代次数、工具调用和失败状态；模拟 listener 写 checkpoint。
4. **Telemetry 边界**：实现脱敏后的 usage/error 事件，证明遥测失败不能改变主流程结果。

## 验收

必须打印一条完整事件时间线；报告说明事件总线带来的解耦收益、顺序/重复/性能代价，以及何时直接调用反而更简单。
