---
name: lark-study-reviver
version: 1.0.0
description: "社区共学纪要复活术：把沉睡在飞书知识库里的会议纪要和共学材料，自动转化为知识卡片、互动测验和学习路径。当用户需要从飞书文档/知识库批量提取知识点、生成学习闪卡、创建互动问答、规划学习路径、给社区群发学习内容时使用。"
metadata:
  requires:
    bins: ["lark-cli"]
---

# Study Reviver — 社区共学纪要复活术

> **前置条件：** 先阅读 [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md) 了解认证、全局参数和安全规则。

## 概述

社区运营者手里有大量飞书文档形式的会议纪要和共学笔记，但这些内容"写完就沉了"——新成员不知道从哪看起，老成员不会回头翻。

Study Reviver 让 AI 读完这些纪要，自动提取知识点，生成可互动的学习资产：

1. **知识卡片** — 结构化的知识点，写入飞书 Base，可筛选、可搜索
2. **互动测验** — 基于知识点生成问答题，发到飞书群做互动学习
3. **学习路径** — 按主题和难度串联知识点，生成入门指南文档
4. **学习播报** — 每日/每周从知识库中挑选知识点，推送到群里

## 核心流程

```
飞书知识库/文档                    飞书 Base
┌──────────────┐    提取     ┌──────────────┐
│ 会议纪要 ×100 │ ────────→ │ 知识卡片表     │
│ 共学笔记 ×50  │    AI      │ (主题/难度/    │
│ 直播回顾 ×20  │  结构化    │  来源/知识点)  │
└──────────────┘            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              飞书群消息      飞书文档        飞书群消息
           ┌──────────┐  ┌──────────┐  ┌──────────┐
           │ 互动测验   │  │ 学习路径   │  │ 每日知识  │
           │ (问答题)   │  │ (入门指南) │  │ (播报)    │
           └──────────┘  └──────────┘  └──────────┘
```

## 命令

### Step 1: 批量读取纪要，提取知识卡片

```bash
# 搜索知识库中的共学材料
lark-cli docs +search --query "共学 OR 会议纪要 OR 读书笔记" --limit 50

# 逐篇读取并提取知识点
lark-cli docs +fetch --doc <doc_token>
```

AI 从每篇文档中提取：
- 知识点标题（一句话）
- 知识点内容（3-5句话解释）
- 主题分类（如：AI基础/Prompt工程/Agent架构/产品思维）
- 难度等级（入门/进阶/高级）
- 来源文档（标题+链接）
- 关键人物（谁提出的观点）

### Step 2: 写入飞书 Base 知识卡片表

```bash
# 创建知识卡片表
lark-cli base +table-create \
  --base-token <base_token> \
  --name "知识卡片" \
  --fields '[
    {"type":"text","name":"知识点标题"},
    {"type":"text","name":"知识点内容"},
    {"type":"select","name":"主题","multiple":false,"options":[
      {"name":"AI基础"},{"name":"Prompt工程"},{"name":"Agent架构"},
      {"name":"产品思维"},{"name":"社区运营"},{"name":"工具实践"}
    ]},
    {"type":"select","name":"难度","multiple":false,"options":[
      {"name":"入门"},{"name":"进阶"},{"name":"高级"}
    ]},
    {"type":"text","name":"来源文档"},
    {"type":"text","name":"关键人物"},
    {"type":"datetime","name":"提取时间"}
  ]'

# 写入知识卡片
lark-cli base +record-upsert \
  --base-token <base_token> \
  --table-id <table_id> \
  --json '{
    "知识点标题": "RAG 的核心不是检索，是分块策略",
    "知识点内容": "检索增强生成（RAG）系统的效果瓶颈往往不在向量检索本身，而在文档分块的粒度和策略。过细的分块丢失上下文，过粗的分块引入噪音。最佳实践是按语义段落分块，保留段落间的引用关系。",
    "主题": "AI基础",
    "难度": "进阶",
    "来源文档": "第12期共学会纪要 https://feishu.cn/docx/xxx",
    "关键人物": "AJ",
    "提取时间": "2026-04-12 00:00:00"
  }'
```

### Step 3: 生成互动测验，发到群里

```bash
# 从知识卡片表随机抽取 3 张卡片
lark-cli base +record-list \
  --base-token <base_token> \
  --table-id <table_id> \
  --limit 3

# AI 基于卡片生成问答题，发到群里
lark-cli im +messages-send \
  --chat-id <chat_id> \
  --type text \
  --content "🧠 今日共学小测验\n\nQ1: RAG 系统的效果瓶颈通常在哪里？\nA) 向量数据库性能\nB) 文档分块策略 ✅\nC) Embedding 模型选择\nD) 检索算法\n\n💡 来源：第12期共学会 by AJ\n\n回复数字参与答题！"
```

### Step 4: 生成学习路径文档

```bash
# 从 Base 按主题+难度排序，生成学习路径
lark-cli base +data-query \
  --base-token <base_token> \
  --table-id <table_id> \
  --group-by "主题" \
  --sort "难度 ASC"

# AI 组织成学习路径文档
lark-cli docs +create \
  --title "AI Agent 入门学习路径 — 基于社区共学沉淀" \
  --folder <folder_token> \
  --md /tmp/learning-path.md
```

### Step 5: 每日知识播报（可配合 cron）

```bash
# 每天从知识卡片表随机抽 1 张，发到群里
# 配合 cron 实现每日自动播报

#!/bin/bash
# gen-daily-knowledge.sh
CARD=$(lark-cli base +record-list \
  --base-token <base_token> \
  --table-id <table_id> \
  --limit 1 --offset $((RANDOM % 100)))

# AI 润色后发送
lark-cli im +messages-send \
  --chat-id <chat_id> \
  --type text \
  --content "📚 今日知识卡片\n\n${CARD_TITLE}\n${CARD_CONTENT}\n\n来源：${CARD_SOURCE}"
```

## Use Cases

### Use Case 1: 社区新人入门加速

**场景：** WAYtoAGI 社区每月有 50+ 新成员加入，但过去 6 个月积累了 100+ 篇共学纪要，新人不知道从哪看起。

**操作：**
```plaintext
帮我从飞书知识库里找所有标题包含"共学"或"读书会"的文档，提取知识点写入 Base，然后按"入门→进阶→高级"生成一份学习路径文档。
```

**效果：** 100 篇纪要 → 300+ 张知识卡片 → 1 份结构化学习路径。新人 30 分钟看完路径，相当于参加了 6 个月的共学。

### Use Case 2: 导师陪你学直播

**场景：** 社区想做"导师陪你一起学"直播，需要从历史纪要中挑选话题和素材。

**操作：**
```plaintext
从知识卡片表里找"高级"难度、"Agent架构"主题的卡片，帮我整理成一份直播大纲，每个知识点配一个讨论问题。
```

**效果：** 5 分钟生成直播大纲 + 讨论问题，导师不用从零准备。

### Use Case 3: 每周互动学习

**场景：** 社区群每周做一次知识问答互动，活跃气氛。

**操作：**
```plaintext
从本周新增的知识卡片里挑 5 个，生成选择题，每题 4 个选项，发到共学群里。
```

**效果：** 群活跃度提升，成员在互动中复习知识，不是被动看文档。

### Use Case 4: 会议纪要二次宣传

**场景：** 上周的共学会讨论了很好的内容，但只有参会者知道。

**操作：**
```plaintext
读取上周三共学会的纪要，提取 3 个最有价值的知识点，生成一篇"共学精华回顾"飞书文档，并发到社区群里。
```

**效果：** 没参会的成员也能获取核心内容，纪要从"存档"变成"传播"。

### Use Case 5: 跨期知识串联

**场景：** 某个话题（如 RAG）在多期共学会中被反复讨论，观点在演进。

**操作：**
```plaintext
在知识卡片表里搜索所有跟"RAG"相关的卡片，按时间排序，帮我整理成一篇"RAG 认知演进史"，标注每个阶段的关键转变。
```

**效果：** 散落在 10 篇纪要里的 RAG 讨论，变成一篇有时间线的认知演进文档。

## 技术架构

```
lark-cli 命令组合：
├── lark-wiki    — 知识库节点遍历
├── lark-doc     — 文档读取 (+fetch) 和创建 (+create)
├── lark-base    — 知识卡片存储和查询
├── lark-im      — 群消息发送（测验/播报）
└── lark-calendar — 可选：关联共学日程
```

跨 4 个飞书域的编排，不是单点 CRUD。

## 与现有 Skill 的差异

| 维度 | 现有 Skill | Study Reviver |
|------|-----------|---------------|
| 数据流向 | 单域操作 | wiki → doc → base → im 四域串联 |
| 使用场景 | 个人效率 | 社区运营（服务一群人） |
| 价值主张 | 操作飞书更方便 | 让沉睡内容产生二次价值 |
| 创新点 | CLI 包装 | 知识复利——从工具到资产复用 |
