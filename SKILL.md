---
name: lark-study-reviver
version: 1.0.0
description: "社区共学纪要复活术：把沉睡在飞书知识库里的会议纪要和共学材料，自动转化为知识卡片、互动测验和学习路径。当用户需要从飞书文档/知识库批量提取知识点、生成学习闪卡、创建互动问答、规划学习路径、给社区群发学习内容时使用。"
metadata:
  requires:
    bins: ["lark-cli"]
---

# Study Reviver — 社区共学纪要复活术

> **前置条件：** 需要 lark-cli 已安装并认证（`lark-cli auth login --domain docs,base,im,wiki`）。认证和权限处理参考 lark-shared skill 文档。

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
lark-cli docs +search --query "共学 OR 会议纪要 OR 读书笔记" --page-size 20

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
# 从 Base 按主题+难度排序查询知识卡片
lark-cli base +record-list \
  --base-token <base_token> \
  --table-id <table_id> \
  --limit 100

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

---

## Plan B: 无搜索权限时的替代方案（wiki nodes list 遍历）

当 `docs +search` 返回空结果（用户未被加入知识库搜索范围）时，使用以下替代流程：

### Step 0: 遍历知识库节点获取文档目录

```bash
# 列出知识库所有顶层节点
lark-cli wiki nodes list --params '{"space_id":"<space_id>","page_size":"50"}' --format json

# 读取目录页文档，提取所有 mention-doc 引用（子文档列表）
lark-cli docs +fetch --doc <root_doc_token>
# 从 markdown 中用正则提取: <mention-doc token="xxx">标题</mention-doc>
```

### Step 1: 关键词匹配筛选

AI 根据用户画像生成关键词列表，对文档标题做匹配打分：

```python
user_keywords = ["claude", "效率", "产品", "agent", "skill", "入门"]
for doc in all_docs:
    score = sum(1 for k in user_keywords if k in doc.title.lower())
# 取 score > 0 的文档，按 score 降序排列
```

### Step 2: 读取匹配文档并提取知识点

```bash
# 逐篇读取高分文档
lark-cli docs +fetch --doc <matched_doc_token>
```

后续流程（提取知识点 → 写入 Base → 生成学习路径）与 Plan A 相同。

### 优先级

1. **优先尝试 `docs +search`**（Plan A）— 更快更精准
2. **search 返回空 → fallback 到 `wiki nodes list`**（Plan B）— 任何人都能用
3. Agent 应自动判断并切换，不需要用户干预

---

## 专项能力：直播归档 → 课程板块

当 Live Replay Engine 积累了多期直播归档后，Study Reviver 可以把同一板块/主题的直播串联成结构化课程。

**这是用户主动触发的能力，不是自动执行。**

### 触发方式

```plaintext
帮我把"未来硅世界"板块的所有直播归档整理成一个课程板块：
按时间排序，每期提取核心知识点，串联成学习路径，标注难度递进关系。
```

### 流程

```
Live Replay 直播归档表（多期）
  → Study Reviver 读取归档记录
    → 逐期读取精华文档，提取知识点
      → 按时间线串联，识别难度递进
        → 生成课程板块文档（飞书文档）
        → 知识点写入知识卡片表（标注来源为直播）
```

### 示例

```plaintext
"未来硅世界"板块已有 13 期直播归档。帮我生成一份课程大纲：
哪些适合入门、哪些适合进阶、建议的学习顺序是什么。
```

输出：
- 课程大纲飞书文档（按难度分级，标注每期直播的核心知识点）
- 知识卡片写入 Base（标注来源为"未来硅世界 第N期"）

### 与 Live Replay 的分工

| | Live Replay | Study Reviver |
|---|---|---|
| 职责 | 单期直播的即时处理（归档/金句） | 多期直播的知识串联（课程/路径） |
| 触发 | 直播结束后自动或手动 | 用户主动要求 |
| 写入 | 直播归档表 + 金句表 | 知识卡片表 + 课程文档 |
| 不做 | 不碰知识卡片 | 不做即时归档 |


---

## 故障自查

当命令返回空结果或报错时，按以下顺序排查：

### 1. 检查 lark-cli 版本
```bash
lark-cli --version
# 如果不是最新版，升级：
npm install -g @larksuite/cli@latest
```
版本过旧可能导致 API 响应解析异常（如搜索返回空但实际有数据）。

### 2. 检查认证状态
```bash
lark-cli auth status
# 确认 tokenStatus 为 valid，scope 包含所需权限
# 如果过期，重新授权：
lark-cli auth login --scope "<missing_scope>"
```

### 3. 检查应用后台权限
打开飞书开发者后台确认 scope 已开通（两层都要有）：
```
https://open.feishu.cn/app/<your_app_id>/permission
```
- 用户授权（auth login）✅
- 应用后台开通 scope ✅
- 两层都要有，缺一不可

### 4. 查看官方文档
```bash
# 查看命令参数
lark-cli <command> --help

# 查看 API schema
lark-cli schema <resource>.<method>
```
官方文档：https://github.com/larksuite/cli

### 5. 常见坑
- `docs +search` 返回字段是 `data.results` 不是 `data.items`
- `docs +search` 需要知识库成员权限才能搜到知识库内容
- `minutes` 需要单独的 `minutes:minutes:readonly` scope
- `base +table-create --fields` 字段过多时可能只创建部分，需逐个 `+field-create` 补建
- `docs +update --markdown` 必须用相对路径（`@./file.md`），不支持绝对路径

