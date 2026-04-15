import { NextRequest, NextResponse } from 'next/server'
import { createDocWithContent } from '@/lib/lark'

export async function POST(req: NextRequest) {
  try {
    const { topic, results } = await req.json()
    
    // 构建内容 Blocks
    const blocks: Array<{type: string, text: string, level?: number}> = [
      { type: 'heading', text: `📚 ${topic} 学习路径`, level: 1 },
      { type: 'text', text: '这是为你定制的学习路径，从 WaytoAGI 知识库中精选的内容。' },
      { type: 'text', text: '' },
      { type: 'heading', text: '🌱 第一阶段：先了解一下', level: 2 },
    ]

    // 添加结果列表
    results?.slice(0, 3).forEach((r: any, i: number) => {
      blocks.push({ type: 'text', text: `${i + 1}. ${r.title}: ${r.url}` })
    })

    blocks.push({ type: 'text', text: '' })
    blocks.push({ type: 'heading', text: '🚀 第二阶段：动手试试', level: 2 })
    
    results?.slice(3, 6).forEach((r: any, i: number) => {
      blocks.push({ type: 'text', text: `${i + 1}. ${r.title}: ${r.url}` })
    })

    blocks.push({ type: 'text', text: '' })
    blocks.push({ type: 'heading', text: '💡 小贴士', level: 2 })
    blocks.push({ type: 'text', text: '• 按顺序阅读，遇到不懂的先标记。' })
    blocks.push({ type: 'text', text: '• 文档由 Study Reviver 自动生成。' })
    
    // 3. 调用飞书 API 创建文档
    const docUrl = await createDocWithContent(`${topic} 学习路径`, blocks)
    
    return NextResponse.json({ url: docUrl })
    
  } catch (error: any) {
    console.error('Generate doc error:', error)
    return NextResponse.json(
      { error: 'Failed to generate doc: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
