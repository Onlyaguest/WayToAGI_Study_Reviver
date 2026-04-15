'use client'

import { useState, useEffect } from 'react'

type Step = 'input' | 'quiz' | 'searching' | 'results' | 'generating' | 'done'

interface Question {
  id: string
  title: string
  question: string
  options?: Array<{ key: string; text: string }>
}

interface Result {
  id: number
  title: string
  url: string
  update: string
  summary: string
}

export default function CustomPage() {
  const [step, setStep] = useState<Step>('input')
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Result[]>([])
  const [docUrl, setDocUrl] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')

  // 输入主题
  const handleTopicSubmit = async () => {
    if (!topic.trim()) return
    setStep('quiz')
    setLoadingMsg('正在为你准备测验...')
    
    try {
      const res = await fetch(`/api/quiz?topic=${encodeURIComponent(topic)}`)
      const data = await res.json()
      setQuestions(data.questions)
    } catch (e) {
      console.error('Failed to load quiz:', e)
      // Fallback to default questions if API fails
      setQuestions([
        {
          id: 'level',
          title: '🧙‍♂️ 灵魂拷问',
          question: '你目前的 AI 工具使用经验？',
          options: [
            { key: 'A', text: '纯小白，基本没用过 👶' },
            { key: 'B', text: '用过 ChatGPT/Kimi 等聊天 AI 💬' },
            { key: 'C', text: '经常使用多种 AI 工具 🛠️' },
            { key: 'D', text: '已经是高阶玩家了 🚀' },
          ]
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
      ])
    }
  }

  // 回答问题
  const handleAnswer = async (key: string) => {
    const q = questions[currentQIndex]
    setAnswers(prev => ({ ...prev, [q.id]: key }))
    
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
    } else {
      // 所有问题回答完毕，开始搜索
      setStep('searching')
      setLoadingMsg('正在从知识库搜索最合适的文章...')
      
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, level: answers.level, time: answers.time, style: answers.style })
        })
        const data = await res.json()
        setResults(data.results)
        setStep('results')
      } catch (e) {
        console.error('Search failed:', e)
        setResults([]) // Show empty state or error
        setStep('results')
      }
    }
  }

  // 生成飞书文档
  const handleGenerateDoc = async () => {
    setStep('generating')
    setLoadingMsg('正在生成飞书文档，请稍候...')
    
    try {
      const res = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, results, level: answers.level, time: answers.time, style: answers.style })
      })
      const data = await res.json()
      if (data.url) {
        setDocUrl(data.url)
        setStep('done')
      } else {
        throw new Error('No URL returned')
      }
    } catch (e) {
      console.error('Generate doc failed:', e)
      setLoadingMsg('生成失败，请重试')
      setStep('results') // Back to results
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#333' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '1.5em', fontWeight: 600, marginBottom: 8 }}>🎯 Study Reviver</h1>
        <p style={{ color: '#666', margin: 0 }}>你的专属学习路径生成器</p>
      </div>

      {/* Chat-like Container */}
      <div style={{ background: '#f9f9f9', borderRadius: 16, padding: 24, minHeight: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        
        {/* Bot Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Bubble sender="bot" text="你好呀！告诉我你想学什么？" />
          
          {topic && <Bubble sender="user" text={`我想学：${topic}`} />}

          {step === 'input' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：AI 社群写作、Hermes Agent..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: '1em' }}
                onKeyDown={(e) => e.key === 'Enter' && handleTopicSubmit()}
              />
              <button
                onClick={handleTopicSubmit}
                style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                开始
              </button>
            </div>
          )}

          {step === 'quiz' && questions[currentQIndex] && (
            <div style={{ marginTop: 8 }}>
              <Bubble sender="bot" text={`${questions[currentQIndex].title}\n\n${questions[currentQIndex].question}`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {questions[currentQIndex].options?.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(opt.key)}
                    style={{ padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontSize: '0.9em', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(step === 'searching' || step === 'generating') && (
            <Bubble sender="bot" text={loadingMsg} />
          )}

          {step === 'results' && (
            <div style={{ marginTop: 8 }}>
              <Bubble sender="bot" text={`摸清了！为你找到了 ${results.length} 篇精华文章：`} />
              <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
                {results.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center' }}>抱歉，暂时没找到相关内容，换个关键词试试？</p>
                ) : (
                  results.map((r, i) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener"
                      style={{ display: 'block', padding: '12px 0', borderBottom: i < results.length - 1 ? '1px solid #f0f0f0' : 'none', textDecoration: 'none', color: '#333' }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>📄 {r.title}</div>
                      <div style={{ fontSize: '0.85em', color: '#888' }}>更新于 {r.update} • {r.summary}</div>
                    </a>
                  ))
                )}
              </div>
              {results.length > 0 && (
                <button
                  onClick={handleGenerateDoc}
                  style={{ marginTop: 16, padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: '0.95em' }}
                >
                  ✨ 生成飞书文档保存
                </button>
              )}
            </div>
          )}

          {step === 'done' && docUrl && (
            <div style={{ marginTop: 8 }}>
              <Bubble sender="bot" text={`✅ 学习路径已生成！\n\n📄 [点击打开飞书文档](${docUrl})\n\n文档里已经整理好了所有链接和说明，随时可以打开看。有疑问随时问我 👇`} />
              <button
                onClick={() => { setStep('input'); setTopic(''); setResults([]); setDocUrl('') }}
                style={{ marginTop: 12, padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9em' }}
              >
                🔄 再来一次
              </button>
            </div>
          )}
        </div>
      </div>

      <footer style={{ textAlign: 'center', marginTop: 40, fontSize: '0.85em', color: '#999' }}>
        Powered by <a href="https://github.com/Onlyaguest/WayToAGI_Study_Reviver" style={{ color: '#666' }}>Study Reviver</a> • WaytoAGI 知识库
      </footer>
    </main>
  )
}

// 聊天气泡组件
function Bubble({ sender, text }: { sender: 'bot' | 'user'; text: string }) {
  const isBot = sender === 'bot'
  return (
    <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isBot ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
        background: isBot ? '#fff' : '#3b82f6',
        color: isBot ? '#333' : '#fff',
        boxShadow: isBot ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
        fontSize: '0.95em',
      }}>
        {text}
      </div>
    </div>
  )
}
