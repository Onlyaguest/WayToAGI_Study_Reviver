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

export default function Home() {
  const [step, setStep] = useState<Step>('input')
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Result[]>([])
  const [docUrl, setDocUrl] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [mounted, setMounted] = useState(false)
  const allTopics = ['Skill', 'Hermes', 'OpenClaw', 'AI 视频', 'AI 绘画', 'Claude Code', 'Vibe Coding', 'MCP', 'GEO', 'Harness']
  const [displayTopics, setDisplayTopics] = useState(allTopics.slice(0, 5))
  const [chatHistory, setChatHistory] = useState<Array<{type: 'bot' | 'user', content: string}>>([
    { type: 'bot', content: '你好呀！我是你的学习路径导航员。\n告诉我你想学什么？' }
  ])

  useEffect(() => {
    setMounted(true)
    setDisplayTopics([...allTopics].sort(() => Math.random() - 0.5).slice(0, 5))
  }, [])

  const addMessage = (type: 'bot' | 'user', content: string) => {
    setChatHistory(prev => [...prev, { type, content }])
  }

  const handleTopicSubmit = async () => {
    if (!topic.trim()) return
    
    addMessage('user', `我想学：${topic}`)
    setStep('quiz')
    
    await new Promise(r => setTimeout(r, 600))
    addMessage('bot', '好的！让我先了解一下你的情况，帮你找到最合适的路径 🧭')
    
    await new Promise(r => setTimeout(r, 800))
    
    try {
      const res = await fetch(`/api/quiz?topic=${encodeURIComponent(topic)}`)
      const data = await res.json()
      setQuestions(data.questions)
      addMessage('bot', `${data.questions[0]?.title || '第一题'}\n${data.questions[0]?.question || '你目前的 AI 工具使用经验？'}`)
    } catch (e) {
      setQuestions([
        { id: 'level', title: '🧙‍♂️ 灵魂拷问', question: '你目前的 AI 工具使用经验？', options: [
          { key: 'A', text: '纯小白，基本没用过 👶' },
          { key: 'B', text: '用过 ChatGPT/Kimi 等聊天 AI 💬' },
          { key: 'C', text: '经常使用多种 AI 工具 🛠️' },
          { key: 'D', text: '已经是高阶玩家了 🚀' },
        ]},
        { id: 'time', title: '📅 现实一点', question: '你一周能匀多少时间给学习？', options: [
          { key: 'A', text: '随缘，有空就看（每周 < 2h）🌊' },
          { key: 'B', text: '每天挤 1 小时（每周 ~5h）🕐' },
          { key: 'C', text: '认真学，每周 10h+ 📚' },
          { key: 'D', text: 'All in，这周啥也不干了就学它 🔥' },
        ]},
        { id: 'style', title: '🧠 学习偏好', question: '你更喜欢哪种学习方式？', options: [
          { key: 'A', text: '先看理论搞懂原理再动手 📖' },
          { key: 'B', text: '别废话了直接让我跑起来 🏃' },
          { key: 'C', text: '边看教程边做项目 🛠️' },
          { key: 'D', text: '给我文档自己啃，有问题再问 📋' },
        ]}
      ])
      addMessage('bot', '🧙‍♂️ 灵魂拷问\n你目前的 AI 工具使用经验？')
    }
  }

  const handleAnswer = async (key: string) => {
    const q = questions[currentQIndex]
    const selectedText = q.options?.find(o => o.key === key)?.text || key
    addMessage('user', selectedText)
    setAnswers(prev => ({ ...prev, [q.id]: key }))
    
    await new Promise(r => setTimeout(r, 400))
    
    if (currentQIndex < questions.length - 1) {
      const nextQ = questions[currentQIndex + 1]
      setCurrentQIndex(prev => prev + 1)
      addMessage('bot', `${nextQ.title}\n${nextQ.question}`)
    } else {
      setStep('searching')
      addMessage('bot', '收到！正在从 10000+ 篇文章中为你搜索最合适的路径...')
      
      await new Promise(r => setTimeout(r, 1200))
      
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, level: answers.level, time: answers.time, style: answers.style })
        })
        const data = await res.json()
        
        if (data.error) {
          addMessage('bot', `抱歉，搜索遇到了问题：${data.error}`)
          setResults([])
        } else {
          const results = data.results || []
          setResults(results)
          addMessage('bot', `🎯 找到了！为你精选了 ${results.length} 篇最相关的文章：`)
        }
        setStep('results')
      } catch (e) {
        addMessage('bot', '抱歉，网络连接失败，请稍后重试。')
        setResults([])
        setStep('results')
      }
    }
  }

  const handleGenerateDoc = async () => {
    setStep('generating')
    addMessage('bot', '正在为你生成一份完整的学习路径文档...')
    
    await new Promise(r => setTimeout(r, 1000))
    
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
        addMessage('bot', `✅ 搞定啦！\n\n你的学习路径文档已生成：\n${data.url}\n\n文档里包含了所有精选文章的链接和说明，随时可以打开看。有疑问随时找我 👋`)
      } else {
        throw new Error('No URL returned')
      }
    } catch (e) {
      addMessage('bot', '抱歉，生成文档时遇到了问题，请重试。')
      setStep('results')
    }
  }

  const resetFlow = () => {
    setStep('input')
    setTopic('')
    setResults([])
    setDocUrl('')
    setCurrentQIndex(0)
    setAnswers({})
    setQuestions([])
    setChatHistory([
      { type: 'bot', content: '你好呀！我是你的学习路径导航员。\n告诉我你想学什么？' }
    ])
  }

  return (
    <div className="page-root">
      {/* Background layers */}
      <div className="bg-base" />
      <div className="bg-gradient" />
      <div className="bg-grain" />
      
      {/* Floating elements */}
      <div className="float-el float-circle" />
      <div className="float-el float-diamond" />
      <div className="float-el float-line" />

      <main className={`main-wrap ${mounted ? 'in' : ''}`}>
        {/* Header - asymmetric layout */}
        <header className="site-header">
          <div className="header-left">
            <div className="brand-tag">WaytoAGI 知识库</div>
            <h1 className="hero-title">
              找到你的<br />
              <em className="title-em">学习路径</em>
            </h1>
          </div>
          <div className="header-right">
            <p className="hero-desc">AI 从 10000+ 篇文章中<br />为你精挑细选</p>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-val">10000+</div>
                <div className="stat-label">篇文章</div>
              </div>
              <div className="stat-sep" />
              <div className="stat-item">
                <div className="stat-val">500+</div>
                <div className="stat-label">场活动</div>
              </div>
              <div className="stat-sep" />
              <div className="stat-item">
                <div className="stat-val">900 万</div>
                <div className="stat-label">学习者</div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat card */}
        <section className="chat-panel">
          <div className="chat-box">
            <div className="chat-scroll">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-msg chat-${msg.type}`}>
                <div className="msg-body">
                  {msg.content.split('\n').map((line, j) => {
                    const urlRegex = /(https?:\/\/[^\s]+)/g
                    if (urlRegex.test(line)) {
                      const parts = line.split(urlRegex)
                      return (
                        <span key={j}>
                          {parts.map((part, k) => 
                            urlRegex.test(part) ? 
                              <a key={k} href={part} target="_blank" className="msg-link">{part}</a> : 
                              part
                          )}
                          {j < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      )
                    }
                    return (
                      <span key={j}>
                        {line}
                        {j < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
            </div>

            {/* Input */}
            {step === 'input' && (
              <div className="chat-input-row">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="你想学什么？"
                  className="chat-field"
                  onKeyDown={(e) => e.key === 'Enter' && handleTopicSubmit()}
                />
                <button onClick={handleTopicSubmit} className="chat-send" disabled={!topic.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            )}

            {/* Quiz options */}
            {step === 'quiz' && questions[currentQIndex] && (
              <div className="chat-quiz">
                <div className="quiz-opts">
                  {questions[currentQIndex].options?.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswer(opt.key)}
                      className="quiz-opt"
                    >
                      <span className="opt-char">{opt.key}</span>
                      <span className="opt-label">{opt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            {step === 'results' && results.length > 0 && (
              <div className="chat-action">
                <button onClick={handleGenerateDoc} className="act-gen">
                  ✨ 生成完整学习路径文档
                </button>
              </div>
            )}

            {/* Reset */}
            {step === 'done' && (
              <div className="chat-action">
                <button onClick={resetFlow} className="act-reset">
                  重新开始 ↻
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Topic chips */}
        {step === 'input' && (
          <div className="chips-area">
            <div className="chips-label">试试这些</div>
            <div className="chips-row">
              {displayTopics.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className="chip"
                    style={{ animationDelay: `${i * 60}ms` }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="site-footer">
          <span>Study Reviver</span>
          <span className="f-dot">·</span>
          <a href="https://waytoagi.feishu.cn/wiki/QPe5w5g7UisbEkkow8XcDmOpn8e">WaytoAGI 知识库</a>
        </footer>
      </main>

      <style>{`
        :root {
          --bg: #f6f5f2;
          --bg-warm: #f0eeea;
          --surface: #fffefc;
          --text: #181818;
          --text-sec: #6b6560;
          --text-muted: #9e9790;
          --accent: #c45d3e;
          --accent-h: #a84d32;
          --accent-sub: rgba(196, 93, 62, 0.05);
          --ok: #2a7a6e;
          --ok-h: #1f5f55;
          --brd: rgba(0,0,0,0.06);
          --brd-s: rgba(0,0,0,0.1);
          --sh-sm: 0 1px 2px rgba(0,0,0,0.03);
          --sh-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03);
          --sh-lg: 0 12px 32px rgba(0,0,0,0.07), 0 4px 8px rgba(0,0,0,0.03);
          --r: 10px;
          --r-lg: 14px;
          --r-xl: 18px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .page-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Manrope', -apple-system, sans-serif;
          color: var(--text);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Background layers */
        .bg-base {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: var(--bg);
        }

        .bg-gradient {
          position: fixed;
          inset: 0;
          z-index: 1;
          background: 
            radial-gradient(ellipse 65% 45% at 5% 10%, rgba(196,93,62,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 45% 65% at 95% 90%, rgba(42,122,110,0.04) 0%, transparent 45%),
            radial-gradient(ellipse 35% 35% at 50% 50%, rgba(240,238,234,0.4) 0%, transparent 65%);
          animation: gradShift 30s ease-in-out infinite alternate;
        }

        @keyframes gradShift {
          0% { transform: translate(0,0) scale(1); }
          33% { transform: translate(1.5%,-1%) scale(1.015); }
          66% { transform: translate(-1%,1.5%) scale(0.985); }
          100% { transform: translate(0.5%,-0.5%) scale(1.005); }
        }

        .bg-grain {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          background-repeat: repeat;
        }

        /* Floating decorations */
        .float-el {
          position: fixed;
          z-index: 3;
          pointer-events: none;
        }

        .float-circle {
          top: 6%;
          right: 10%;
          width: 100px;
          height: 100px;
          border: 1px solid rgba(196,93,62,0.08);
          border-radius: 50%;
          animation: f1 22s ease-in-out infinite;
        }

        .float-diamond {
          bottom: 12%;
          left: 6%;
          width: 60px;
          height: 60px;
          border: 1px solid rgba(42,122,110,0.06);
          transform: rotate(45deg);
          animation: f2 18s ease-in-out infinite;
        }

        .float-line {
          top: 35%;
          left: 12%;
          width: 1px;
          height: 60px;
          background: linear-gradient(to bottom, transparent, rgba(196,93,62,0.12), transparent);
          animation: f3 14s ease-in-out infinite;
        }

        @keyframes f1 {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(-8px,6px); }
        }

        @keyframes f2 {
          0%,100% { transform: rotate(45deg) translate(0,0); }
          50% { transform: rotate(45deg) translate(4px,-6px); }
        }

        @keyframes f3 {
          0%,100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(-8px) scaleY(1.15); opacity: 1; }
        }

        /* Main wrapper */
        .main-wrap {
          position: relative;
          z-index: 4;
          max-width: 660px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .main-wrap.in .site-header { opacity: 1; transform: translateY(0); }
        .main-wrap.in .chat-panel { opacity: 1; transform: translateY(0); transition-delay: 0.12s; }
        .main-wrap.in .chips-area { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }
        .main-wrap.in .site-footer { opacity: 1; transition-delay: 0.36s; }

        .site-header, .chat-panel, .chips-area {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }

        .site-footer {
          opacity: 0;
          transition: opacity 0.8s ease 0.36s;
        }

        /* Header */
        .site-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 56px 0 40px;
          gap: 28px;
        }

        .header-left { flex: 1; }

        .brand-tag {
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 10px;
        }

        .hero-title {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: clamp(2rem, 4.5vw, 2.8rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.025em;
          color: var(--text);
        }

        .title-em {
          font-style: italic;
          color: var(--accent);
        }

        .header-right {
          text-align: right;
          min-width: 160px;
        }

        .hero-desc {
          font-size: 0.85rem;
          color: var(--text-sec);
          line-height: 1.5;
          margin-bottom: 16px;
          font-weight: 400;
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .stat-val {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.58rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 3px;
        }

        .stat-sep {
          width: 1px;
          height: 20px;
          background: var(--brd-s);
        }

        /* Chat panel */
        .chat-panel {
          opacity: 0;
          transform: translateY(16px);
        }

        .chat-box {
          background: var(--surface);
          border-radius: var(--r-xl);
          box-shadow: var(--sh-lg);
          border: 1px solid var(--brd);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 400px;
          max-height: 580px;
        }

        .chat-scroll {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          scrollbar-width: thin;
          scrollbar-color: var(--brd) transparent;
        }

        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: var(--brd); border-radius: 2px; }

        /* Messages */
        .chat-msg {
          display: flex;
          animation: msgIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-bot { justify-content: flex-start; }
        .chat-user { justify-content: flex-end; }

        .msg-body {
          max-width: 78%;
          padding: 11px 15px;
          border-radius: 15px;
          line-height: 1.55;
          font-size: 0.85rem;
          white-space: pre-wrap;
        }

        .chat-bot .msg-body {
          background: var(--bg-warm);
          color: var(--text);
          border-bottom-left-radius: 5px;
          border: 1px solid var(--brd);
        }

        .chat-user .msg-body {
          background: var(--text);
          color: #fff;
          border-bottom-right-radius: 5px;
        }

        .msg-link {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
          word-break: break-all;
        }

        .chat-user .msg-link {
          color: #7dd3fc;
        }

        /* Input row */
        .chat-input-row {
          padding: 16px 24px;
          border-top: 1px solid var(--brd);
          display: flex;
          gap: 10px;
          align-items: center;
          background: var(--surface);
        }

        .chat-field {
          flex: 1;
          padding: 10px 0;
          border: none;
          font-size: 0.85rem;
          font-family: inherit;
          color: var(--text);
          background: transparent;
          outline: none;
        }

        .chat-field::placeholder { color: var(--text-muted); }

        .chat-send {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .chat-send:disabled { opacity: 0.35; cursor: not-allowed; }
        .chat-send:not(:disabled):hover { background: var(--accent-h); transform: scale(1.06); }

        /* Quiz */
        .chat-quiz {
          padding: 0 24px 20px;
        }

        .quiz-opts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .quiz-opt {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 12px;
          background: var(--bg);
          border: 1.5px solid var(--brd);
          border-radius: var(--r);
          font-size: 0.78rem;
          font-family: inherit;
          color: var(--text);
          cursor: pointer;
          text-align: left;
          line-height: 1.35;
          transition: all 0.18s;
        }

        .quiz-opt:hover {
          border-color: var(--accent);
          background: var(--accent-sub);
        }

        .opt-char {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: var(--surface);
          border: 1px solid var(--brd-s);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-sec);
          flex-shrink: 0;
          transition: all 0.18s;
        }

        .quiz-opt:hover .opt-char {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Action area */
        .chat-action {
          padding: 14px 24px 20px;
          border-top: 1px solid var(--brd);
        }

        .act-gen {
          width: 100%;
          padding: 13px;
          background: var(--ok);
          color: #fff;
          border: none;
          border-radius: var(--r);
          font-size: 0.84rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .act-gen:hover { background: var(--ok-h); transform: translateY(-1px); }

        .act-reset {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.82rem;
          font-family: inherit;
          cursor: pointer;
          padding: 6px 0;
          transition: color 0.2s;
        }

        .act-reset:hover { color: var(--text); }

        /* Chips */
        .chips-area {
          margin-top: 28px;
          opacity: 0;
          transform: translateY(10px);
        }

        .chips-label {
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 10px;
          text-align: center;
        }

        .chips-row {
          display: flex;
          gap: 7px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .chip {
          padding: 6px 14px;
          background: var(--surface);
          border: 1px solid var(--brd);
          border-radius: 100px;
          font-size: 0.78rem;
          font-family: inherit;
          color: var(--text-sec);
          cursor: pointer;
          transition: all 0.22s;
          animation: chipIn 0.5s ease both;
        }

        @keyframes chipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-sub);
        }

        /* Footer */
        .site-footer {
          text-align: center;
          padding: 36px 0 44px;
          font-size: 0.72rem;
          color: var(--text-muted);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .site-footer a {
          color: var(--text-sec);
          text-decoration: none;
          transition: color 0.2s;
        }

        .site-footer a:hover { color: var(--text); }

        .f-dot { opacity: 0.4; }

        /* Responsive */
        @media (max-width: 600px) {
          .site-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
            padding: 44px 0 28px;
          }
          .header-right { text-align: left; }
          .stats-row { justify-content: flex-start; }
          .quiz-opts { grid-template-columns: 1fr; }
          .chat-box { min-height: 360px; }
        }
      `}</style>
    </div>
  )
}
