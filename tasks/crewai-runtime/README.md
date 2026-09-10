# 精读八：kickoff 生命周期、异步与 checkpoint

源码：`crew.py:995-1088`、`crew.py` 的 async/for_each 路径、`task.py` 的 async 执行、`state/checkpoint_config.py`、`state/checkpoint_listener.py`、`state/runtime.py`、streaming 相关实现。

## 任务

1. **生命周期**：按输入插值 → runtime scope → 执行 → callback → memory drain → usage 的顺序实现最小 kickoff wrapper。
2. **异步与批量**：复现 async task 并发、遇到同步任务先 drain、`kickoff_for_each` 的批量隔离；对照组是单一同步 `for` 循环。
3. **streaming 与事件**：把中间 step/tool 结果流出，同时保证最终 TaskOutput/CrewOutput 不被破坏。
4. **checkpoint 恢复**：在第二个任务失败后保存状态，重新运行时跳过已完成任务；覆盖重复恢复和不兼容输入。

## 验收

必须展示正常、失败、恢复三条路径，并说明并发、回调、流式、持久化带来的复杂度代价。step-09 不再是可选项；至少完成全部四个任务。
