import paths from '../data/paths.json'

export default function Home() {
  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:'20px',fontFamily:'-apple-system,sans-serif'}}>
      <h1 style={{textAlign:'center',fontSize:'1.8em'}}>🧠 WAYtoAGI 学习路径</h1>
      <p style={{textAlign:'center',color:'#666',marginBottom:32}}>
        告诉我你想学什么，AI 从 1000+ 篇知识库文档中帮你挑
      </p>

      <div style={{display:'grid',gap:16}}>
        {paths.map(p => (
          <a key={p.id} href={p.docUrl} target="_blank" rel="noopener"
            style={{display:'block',padding:20,borderRadius:12,background:'#fff',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)',textDecoration:'none',color:'inherit'}}>
            <div style={{fontSize:'1.3em',marginBottom:8}}>
              {p.emoji} {p.title}
            </div>
            <div style={{color:'#666',fontSize:'0.9em',marginBottom:8}}>{p.subtitle}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {p.tags.map(t => (
                <span key={t} style={{background:'#f0f0f0',padding:'2px 8px',borderRadius:12,fontSize:'0.8em'}}>{t}</span>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:'0.85em',color:'#999'}}>
              {p.days.length} 个学习日 · {p.duration}
            </div>
          </a>
        ))}
      </div>

      <div style={{marginTop:40,padding:24,borderRadius:12,background:'#f8f4ff',textAlign:'center'}}>
        <h3>🤖 以上都不是我？</h3>
        <p style={{color:'#666',marginBottom:16}}>告诉 AI 你的情况，定制专属路径</p>
        <a href="/custom" style={{display:'inline-block',padding:'10px 24px',background:'#7c3aed',color:'#fff',borderRadius:8,textDecoration:'none'}}>
          AI 帮我定制
        </a>
      </div>

      <footer style={{textAlign:'center',color:'#999',marginTop:40,fontSize:'0.85em'}}>
        <a href="https://github.com/Onlyaguest/WayToAGI_Study_Reviver" target="_blank">GitHub</a>
        {' · '}
        <a href="https://waytoagi.feishu.cn/wiki/QPe5w5g7UisbEkkow8XcDmOpn8e" target="_blank">WAYtoAGI 知识库</a>
        {' · '}
        Powered by 飞书 CLI + Study Reviver
      </footer>
    </main>
  )
}
