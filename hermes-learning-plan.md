# Hermes Agent 学习计划

> 基于 WaytoAGI 知识库 10000+ 篇内容，为你定制 Hermes Agent 专属学习路径
> 生成时间：2026-04-15 | 数据来源：飞书知识库共学纪要 + 技术教程

---

## 学习路径总览

| 阶段 | 主题 | 时长 | 难度 |
|------|------|------|------|
| Week 1 Day 1-2 | 认识 Hermes：底层逻辑与安装 | 2小时 | 入门 |
| Week 1 Day 3-4 | 核心配置：灵魂、皮肤、记忆 | 2小时 | 入门 |
| Week 1 Day 5-7 | 能力扩展：搜索、浏览器、Sandbox | 3小时 | 进阶 |
| Week 2 | 技能系统：Skill 创建与进化 | 4小时 | 进阶 |
| Week 3 | 多 Agent 与自动化：Cron、Hooks、Worker | 4小时 | 高级 |
| Week 4 | 实战项目：从 0 到 1 搭建你的 Agent | 6小时 | 高级 |

---

## 第 1 周：基础篇

### Day 1-2：认识 Hermes Agent

**目标：** 理解 Hermes 是什么，为什么它能自我进化

**知识点：**
1. **Hermes vs 其他 Agent** -- 最大差异：Hermes 会从经验中学习，自己创建 Skill，能力持续增长
2. **核心架构** -- 内置记忆层 + Skill 系统 + Cron 定时任务 + Hook 自动化
3. **安装部署** -- 环境检查（Python/uv/Git），安装 Hermes，配置 .env

**关键概念：**
- SOUL.md：定义 Agent 的人格和行为准则
- Skill 系统：Agent 的能力模块，可自动创建和进化
- Memory 三层架构：内置记忆 -> Skill 记忆 -> 外挂知识库

**实践：**
```bash
# 安装 Hermes
curl -fsSL https://raw.githubusercontent.com/hermes-agent/install/main/install.sh | bash

# 检查安装
hermes --version

# 配置 API Key
echo "OPENROUTER_API_KEY=sk-..." >> ~/.hermes/.env
```

### Day 3-4：核心配置

**目标：** 完成个性化配置，让 Hermes 成为你的专属助手

**知识点：**
1. **灵魂定义 (SOUL.md)** -- 思考模式、自我约束、输出纪律
2. **TUI 皮肤** -- /skin ares, /skin podeidon, /skin sisyphus, /skin charizard
3. **记忆系统调优** -- MEMORY.md 大小调整，memory_char_limit 配置
4. **YOLO 模式** -- 快速决策模式 vs 深思熟虑模式
5. **对话管理** -- 重置对话 & 恢复对话

**实践：**
```bash
# 编辑灵魂文件
nano ~/.hermes/SOUL.md

# 调整记忆限制
# 在 ~/.hermes/config.yaml 中设置 memory_char_limit: 4000

# 切换皮肤
/skin podeidon
```

### Day 5-7：能力扩展

**目标：** 解锁 Hermes 的全部能力

**知识点：**
1. **浏览器反爬** -- 配置 Camofox 或 Browserbase
2. **Web Search** -- 配置搜索引擎，让 Hermes 能联网搜索
3. **Sandbox 沙箱** -- Docker 沙箱模式，安全执行代码
4. **辅助进程 (Auxiliary)** -- 上下文压缩阈值调整（默认 50%）

**实践：**
```bash
# 配置 web search
# 在 ~/.hermes/config.yaml 中添加搜索引擎配置

# 配置 sandbox
# 安装 Docker，设置 sandbox 模式
```

---

## 第 2 周：进阶篇

### Skill 系统深度使用

**目标：** 掌握 Skill 创建、编辑和进化

**知识点：**
1. **Skill 目录结构** -- SKILL.md + references/ + templates/ + scripts/ + assets/
2. **Skill 创建时机** -- 复杂任务成功后、解决困难错误后、发现新工作流后
3. **Skill 维护** -- 加载后发现过时/不完整立即 patch
4. **技能复用** -- 从经验中提取通用能力注入 Skill

**实践流程：**
```
任务失败/成功 -> 总结经验 -> 创建/更新 Skill -> 下次自动加载
```

---

## 第 3 周：高级篇

### 多 Agent 与自动化

**知识点：**
1. **多 Agent 协作** -- Worker 分身，用便宜模型处理简单任务
2. **Cron 定时任务** -- 每日自动播报、数据报告生成
3. **Hook 自动化** -- 事件通知处理，与 Plugin 互补
4. **飞书集成** -- 飞书 CLI + Hermes，完全体飞书助手
5. **微信接入** -- 原生支持，扫码即用
6. **备份策略** -- sessions 备份，push 到 GitHub 私有仓库

**实践：**
```bash
# 配置 Worker 分身
# 设置 Worker 为 Docker 沙箱模式

# 创建定时任务
# 每天 09:00 自动生成数据报告
```

---

## 第 4 周：实战篇

### 从 0 到 1 搭建你的 Agent

**实战项目（任选一个）：**
1. **全自动知识库助手** -- 定期从知识库提取新内容，生成摘要发到群里
2. **代码开发助手** -- 配置 Claude Code 集成，辅助日常开发
3. **个人知识管家** -- 用 Obsidian + Hermes 搭建第二大脑
4. **社区运营 Agent** -- 自动整理会议纪要、生成学习卡片、群内互动

**验收标准：**
- Agent 能独立完成一个完整工作流
- 不需要人工干预中间步骤
- 有自动错误处理和 Skill 沉淀机制

---

## 推荐学习资源

| 资源 | 说明 |
|------|------|
| Hermes 7个冷知识 | 隐藏功能和效率技巧 |
| 安装后建议尝试的10件事 | 源码review验证的实操清单 |
| Windows 安装教程 | 完整部署指南+高频坑点解决 |
| Hermes vs OpenClaw 对比 | 全维度对比，帮你选型 |
| 飞书 CLI 集成教程 | 5分钟保姆级教程 |
| 微信接入教程 | 扫码即用，5分钟上手 |
| 公众号文章爬取 | Hermes 稳定爬取教程 |

---

## 学习捷径（来自社区经验）

1. **不要一开始就配外挂记忆** -- 先用内置三层记忆，不够再加
2. **memory_char_limit 调到 4000** -- 默认值容易被打满
3. **先跑通10件事再深入学习** -- 安装后建议先尝试10项功能
4. **每次失败都沉淀为 Skill** -- 这是 Hermes 最核心的进化机制
5. **备份 sessions 和 profile** -- push 到 GitHub 私有仓库

---

*本计划由 Study Reviver 自动生成，数据来源：WaytoAGI 知识库 399 篇共学纪要 + 37 个知识板块*
