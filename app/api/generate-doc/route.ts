import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const { topic, results, level, time, style } = await req.json()
    
    // 1. 生成 Markdown 内容
    const mdContent = generateMarkdown(topic, results, level, time, style)
    
    // 2. 写入临时文件到当前工作目录 (避免 /tmp 权限/链接问题)
    const tempFile = path.join(process.cwd(), `learning-path-${Date.now()}.md`)
    fs.writeFileSync(tempFile, mdContent)
    
    // 3. 调用 lark-cli 创建文档
    // 使用当前目录的相对路径，转义标题中的特殊字符
    const safeTitle = topic.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const cmd = `lark-cli docs +create --title "${safeTitle} 学习路径 — Study Reviver 定制" --markdown @${path.basename(tempFile)} --wiki-space 7226178700923011075`
    console.log('Executing:', cmd)
    
    const { stdout } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 30000
    })
    
    const result = JSON.parse(stdout)
    const docUrl = result?.data?.doc_url
    
    // 4. 清理临时文件
    fs.unlinkSync(tempFile)
    
    if (!docUrl) {
      throw new Error('No doc_url in response')
    }
    
    return NextResponse.json({ url: docUrl })
    
  } catch (error: any) {
    console.error('Generate doc error:', error)
    return NextResponse.json(
      { error: 'Failed to generate doc: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

function generateMarkdown(topic: string, results: any[], level: string, time: string, style: string) {
  const now = new Date().toISOString().split('T')[0]
  
  let md = `# 📚 ${topic} 学习路径 — Study Reviver 定制

> 生成时间：${now} | 数据来源：WaytoAGI 知识库

---

## 👋 你好呀！

这是为你定制的学习路径，从 WaytoAGI 知识库的 10000+ 篇文章中，精挑细选了最精华的内容。

不用有压力，按照自己的节奏来就好。每一步都配有原文链接，点开就能看 👇

---

## 📖 学习路径

### 🌱 第一阶段：先了解一下
> 这几篇帮你建立基本认知，每篇大约 10-15 分钟

| # | 文章 | 更新 | 为什么先看这篇 |
|---|------|------|------|
`

  // 分组：前 3 个为第一阶段，中间 3 个为第二阶段，剩下的为第三阶段
  const phase1 = results.slice(0, 3)
  const phase2 = results.slice(3, 6)
  const phase3 = results.slice(6)
  
  phase1.forEach((r: any, i: number) => {
    md += `| ${i+1} | [${r.title}](${r.url}) | ${r.update} | 建立基本认知 |\n`
  })
  
  md += `
### 🚀 第二阶段：动手试试
> 看完可以直接上手实践

| # | 文章 | 更新 | 为什么看这篇 |
|---|------|------|------|
`
  
  phase2.forEach((r: any, i: number) => {
    md += `| ${i+1} | [${r.title}](${r.url}) | ${r.update} | 提升实操能力 |\n`
  })
  
  md += `
### 🛠️ 第三阶段：深入探索（有空再看）
> 这些是进阶内容，随缘看就好

| # | 文章 | 更新 | 为什么看这篇 |
|---|------|------|------|
`

  phase3.forEach((r: any, i: number) => {
    md += `| ${i+1} | [${r.title}](${r.url}) | ${r.update} | 进阶深入 |\n`
  })
  
  md += `
---

## 💡 小贴士

- 按顺序看就行，不用跳着读
- 遇到看不懂的先放着，后面会慢慢明白
- 有疑问随时问我，我们一起讨论

---
*这份学习路径由 Study Reviver 自动生成，内容来自 WaytoAGI 社区知识库*
`
  return md
}
