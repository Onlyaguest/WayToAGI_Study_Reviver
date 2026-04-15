import { NextRequest, NextResponse } from 'next/server'
import { createDocWithContent } from '@/lib/lark'

export async function POST(req: NextRequest) {
  try {
    const { topic, results } = await req.json()
    
    if (!results || results.length === 0) {
      return NextResponse.json({ error: '没有找到相关文章' }, { status: 400 })
    }

    const title = `${topic} 学习路径 — Study Reviver 定制`
    const docUrl = await createDocWithContent(title, results)
    
    return NextResponse.json({ url: docUrl })
    
  } catch (error: any) {
    console.error('Generate doc error:', error)
    return NextResponse.json(
      { error: 'Failed to generate doc: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
