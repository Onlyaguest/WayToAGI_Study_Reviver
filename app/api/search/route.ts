import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 关键词映射（和 quiz API 保持一致，实际项目中可以抽离为公共模块）
const KEYWORD_MAP: Record<string, string> = {
  'hermes': 'Hermes OR Agent OR 智能体',
  'agent': 'Hermes OR Agent OR 智能体',
  '智能体': 'Hermes OR Agent OR 智能体',
  '编程': 'Claude Code OR AI 编程 OR 智能体编程',
  'code': 'Claude Code OR AI 编程 OR 智能体编程',
  'python': 'Claude Code OR AI 编程 OR 智能体编程',
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
  'ppt': 'PPT OR 演示 OR Gamma OR 幻灯片',
  '幻灯片': 'PPT OR 演示 OR Gamma OR 幻灯片',
}

export async function POST(req: NextRequest) {
  try {
    const { topic, level, time, style } = await req.json()
    
    // 1. 确定搜索关键词
    let query = topic
    for (const [key, value] of Object.entries(KEYWORD_MAP)) {
      if (topic.toLowerCase().includes(key)) {
        query = value
        break
      }
    }
    
    // 2. 执行搜索
    const cmd = `lark-cli docs +search --query "${query}" --page-size 15 --format json`
    console.log('Executing:', cmd)
    
    const { stdout } = await execAsync(cmd, { 
      cwd: process.cwd(),
      timeout: 30000 
    })
    
    const data = JSON.parse(stdout)
    const results = data?.data?.results || []
    
    // 3. 过滤和处理结果
    // 清理标题中的 <h> 标签
    const cleanText = (text: string) => text?.replace(/<\/?h>/g, '') || ''
    
    const processedResults = results.map((r: any, i: number) => ({
      id: i,
      title: cleanText(r.title_highlighted || r.result_meta?.title || 'Untitled'),
      url: r.result_meta?.url || '#',
      update: r.result_meta?.update_time_iso?.split('T')[0] || '',
      summary: cleanText(r.summary_highlighted || '').substring(0, 100),
    }))
    
    // 简单排序：优先最近的，然后根据 topic 匹配度（这里简单处理）
    // 实际可以更复杂，Phase 1 简单返回前 8 个
    const topResults = processedResults.slice(0, 8)
    
    return NextResponse.json({ results: topResults })
    
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed: ' + (error.message || 'Unknown error') }, 
      { status: 500 }
    )
  }
}
