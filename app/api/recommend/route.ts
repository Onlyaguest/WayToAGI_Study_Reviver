import { NextRequest, NextResponse } from 'next/server'
import paths from '../../../data/paths.json'

export async function POST(req: NextRequest) {
  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'missing question' }, { status: 400 })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })

  // Build prompt with paths context
  const pathsSummary = paths.map(p => `${p.emoji} ${p.title}: ${p.subtitle} (${p.tags.join(', ')})`).join('\n')

  const prompt = `你是 WAYtoAGI 社区的学习路径推荐助手。用户描述了自己的情况，请根据以下预设路径推荐最合适的，或者给出个性化建议。

预设路径：
${pathsSummary}

用户说：${question}

请用中文回复，200字以内，推荐1-2条最合适的路径并说明原因。如果预设路径都不太合适，给出个性化建议。语气亲切友好。`

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || '抱歉，AI 暂时无法回复'
    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
