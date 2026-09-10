# crewai-source-study

CrewAI 源码精读与分析。本仓库只放**分析产物**，上游源码不入库（体积大）。

## 内容

| 文档 | 说明 |
|-|-|
| [docs/crewai-source-map.md](docs/crewai-source-map.md) | **CrewAI 源码地图**：仓库结构、执行链路、模块全景、推荐阅读顺序、关键 seam 速查 |

## 基线

- 分析对象：[crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)
- 版本：**v1.15.21**，commit `a8d330de0`（2026-09-09）
- 本地源码：`source/`（`git clone` 得到，已 gitignore）

## 在线阅读

- 飞书：https://my.feishu.cn/docx/PZGmdlmLCoxEA9xHEavcCbjXnET
- 归档位置：AI Agent 知识点手册 / crewai源码分析

## 本地准备

```bash
# 直连克隆（走代理会慢 45 倍）
git -c http.proxy= -c https.proxy= clone https://github.com/crewAIInc/crewAI.git source
```

## 后续计划

按源码地图「阶段二」选一条机制做深入拆解：机制原理 + 源码逐段解读 + 从零渐进复现（可运行代码）。

- [ ] 机制拆解一：hierarchical manager agent（多 agent 协同）
- [ ] 机制拆解二：Flow 持久化与人在环（agent 进生产）
