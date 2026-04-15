import { NextRequest, NextResponse } from 'next/server'
import { searchDocs } from '@/lib/lark'

// 关键词映射
const KEYWORD_MAP: Record<string, string> = {
  'hermes': 'Hermes OR Agent OR 智能体',
  'agent': 'Hermes OR Agent OR 智能体',
  '智能体': 'Hermes OR Agent OR 智能体',
  '编程': 'Claude Code OR AI 编程',
  'code': 'Claude Code OR AI 编程',
  'python': 'Claude Code OR AI 编程',
  '绘画': 'AI 绘画 OR ComfyUI OR Stable Diffusion',
  'prompt': 'Prompt OR 提示词',
  '提示词': 'Prompt OR 提示词',
  '运营': '社区运营 OR 自动化',
  '视频': 'AI 视频 OR 视频生成',
  '音乐': 'AI 音乐',
  'rag': 'RAG OR 检索增强',
  '多智能体': 'Multi-Agent OR Harness',
  '写作': '写作 OR Prompt OR 内容创作',
  '文章': '写作 OR Prompt OR 内容创作',
  'skill': 'Skill OR 技能',
  'openclaw': 'OpenClaw OR 龙虾',
  'vibe': 'Vibe Coding OR 编程',
  'mcp': 'MCP OR 协议',
  'geo': 'GEO OR 搜索优化',
  'harness': 'Harness OR 架构',
}

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json()
    
    // 1. 确定搜索关键词
    let query = topic
    const lowerTopic = topic.toLowerCase()
    for (const [key, value] of Object.entries(KEYWORD_MAP)) {
      if (lowerTopic.includes(key)) {
        query = value
        break
      }
    }
    
    // 2. 调用飞书 API 搜索
    const results = await searchDocs(query)
    
    // 返回前 8 个
    return NextResponse.json({ results: results.slice(0, 8) })
    
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed: ' + (error.message || 'Unknown error') }, 
      { status: 500 }
    )
  }
}
