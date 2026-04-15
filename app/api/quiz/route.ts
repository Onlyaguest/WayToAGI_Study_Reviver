import { NextResponse } from 'next/server'

// 简单的关键词映射，对应 SKILL.md 中的映射表
const KEYWORD_MAP: Record<string, string> = {
  'hermes': 'Hermes OR Agent OR 智能体',
  'agent': 'Hermes OR Agent OR 智能体',
  '智能体': 'Hermes OR Agent OR 智能体',
  '编程': 'Claude Code OR AI 编程',
  '绘画': 'AI 绘画 OR ComfyUI OR Stable Diffusion',
  'prompt': 'Prompt OR 提示词 OR 提示工程',
  '提示词': 'Prompt OR 提示词 OR 提示工程',
  '运营': '社区运营 OR 运营提效 OR 自动化',
  '视频': 'AI 视频 OR 视频生成',
  '音乐': 'AI 音乐',
  'rag': 'RAG OR 检索增强',
  '多智能体': '多智能体 OR Multi-Agent OR Harness',
  '写作': '社群 OR 写作 OR Prompt OR 内容创作',
  '文章': '社群 OR 写作 OR Prompt OR 内容创作',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const topic = searchParams.get('topic') || ''

  // 根据主题生成测验问题
  // 为了简化，前端可以根据 topic 直接显示问题，或者这里返回一组问题
  // 这里返回一个简单的问题集结构
  const questions = [
    {
      id: 'level',
      title: '🧙‍♂️ 灵魂拷问',
      ...getLevelQuestion(topic),
    },
    {
      id: 'time',
      title: '📅 现实一点',
      question: '你一周能匀多少时间给学习？',
      options: [
        { key: 'A', text: '随缘，有空就看（每周 < 2h）🌊' },
        { key: 'B', text: '每天挤 1 小时（每周 ~5h）🕐' },
        { key: 'C', text: '认真学，每周 10h+ 📚' },
        { key: 'D', text: 'All in，这周啥也不干了就学它 🔥' },
      ]
    },
    {
      id: 'style',
      title: '🧠 学习偏好',
      question: '你更喜欢哪种学习方式？',
      options: [
        { key: 'A', text: '先看理论搞懂原理再动手 📖' },
        { key: 'B', text: '别废话了直接让我跑起来 🏃' },
        { key: 'C', text: '边看教程边做项目 🛠️' },
        { key: 'D', text: '给我文档自己啃，有问题再问 📋' },
      ]
    }
  ]

  return NextResponse.json({ questions })
}

function getLevelQuestion(topic: string) {
  const t = topic.toLowerCase()
  if (t.includes('hermes') || t.includes('agent') || t.includes('智能体')) {
    return {
      question: '你之前用过哪种 AI Agent？',
      options: [
        { key: 'A', text: '完全没用过，Hermes 是第一个 👶' },
        { key: 'B', text: '用过 ChatGPT/Claude 聊天，但没搭过本地 Agent 📱' },
        { key: 'C', text: '装过 OpenClaw/Claude Code，跑通过基本流程 🔧' },
        { key: 'D', text: '已经给 Agent 写过 Skill 了，想再深入 🚀' },
      ]
    }
  }
  if (t.includes('编程') || t.includes('code') || t.includes('python')) {
    return {
      question: '你对编程的熟悉程度是？',
      options: [
        { key: 'A', text: '完全不会写代码，但会复制粘贴跑命令 📋' },
        { key: 'B', text: '写过 Python/JS，能看懂别人代码但自己写会卡 🐍' },
        { key: 'C', text: '日常写代码，只是没用 AI 辅助过 👨‍💻' },
        { key: 'D', text: '全栈选手，想让 AI 帮我干掉重复工作 🤖' },
      ]
    }
  }
  // 通用
  return {
    question: '你目前的 AI 工具使用经验？',
    options: [
      { key: 'A', text: '纯小白，基本没用过 👶' },
      { key: 'B', text: '用过 ChatGPT/Kimi 等聊天 AI 💬' },
      { key: 'C', text: '经常使用多种 AI 工具 🛠️' },
      { key: 'D', text: '已经是高阶玩家了 🚀' },
    ]
  }
}
