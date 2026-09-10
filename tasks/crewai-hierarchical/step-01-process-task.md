# Step 01：Process 与 Task 数据流

## 学习目标

先不引入 Agent Loop，理解 sequential 和 hierarchical 都会进入共享任务循环；hierarchical 改变的是执行 Agent 和工具装配方式。

## 源码锚点

- process.py:4：Process 只有 sequential / hierarchical
- crew.py:995：kickoff()
- crew.py:1512：_run_sequential_process()
- crew.py:1516：_run_hierarchical_process()
- crew.py:1561：_execute_tasks()
- task.py:585-890：Task 执行与输出

## 实现

用确定性函数实现 Crew、Task、TaskOutput：

    kickoff → process 分支 → executeTasks → TaskOutput → 下一个 Task

必须展示：

- 普通 Task 的 agent 归属
- hierarchical 暂时只记录准备 Manager，本步不实现委派
- 前序 Task 输出如何成为后续 Task 的 context
- Task 不直接持有 LLM 调用逻辑

## 对照组

朴素实现是一个 for 循环直接调用 agent.run(description)。打印它无法统一表达 context、输出契约和流程分支。

## 产出与验收

目录：articles/crewai-hierarchical-ts/src/steps/step-01-process-task/
报告：reports/crewai-hierarchical-ts-step-01.md

- [ ] sequential/hierarchical 进入同一任务循环
- [ ] context 和 TaskOutput 可见
- [ ] 本步没有 LLM 调用
- [ ] 对照组和 CrewAI 风格实现并排输出
