const FEISHU_APP_ID = process.env.FEISHU_APP_ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET
const WIKI_SPACE_ID = process.env.FEISHU_WIKI_SPACE_ID || '7226178700923011075'

let cachedToken: string | null = null
let tokenExpireTime = 0

async function getTenantToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpireTime) return cachedToken

  console.log('Fetching Feishu tenant token...')
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  })

  const text = await res.text()
  console.log('Token Response Status:', res.status)
  
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    console.error('Failed to parse token response:', text.substring(0, 200))
    throw new Error(`获取 Token 失败: Invalid JSON response`)
  }

  if (data.code !== 0) {
    console.error('Token Error:', data.msg)
    throw new Error(`获取 Token 失败: ${data.msg}`)
  }

  cachedToken = data.tenant_access_token
  tokenExpireTime = Date.now() + (data.expire - 300) * 1000
  return cachedToken
}

export async function searchDocs(query: string) {
  try {
    const token = await getTenantToken()
    console.log('Searching Feishu docs in space:', WIKI_SPACE_ID, 'with query:', query)

    // 方案 B: 使用 Wiki 节点遍历 API，更稳定且不需要搜索权限
    // 获取知识库根节点
    const nodesRes = await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${WIKI_SPACE_ID}/nodes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const nodesText = await nodesRes.text()
    let nodesData
    try { nodesData = JSON.parse(nodesText) } catch { 
      console.error('Failed to parse nodes response:', nodesText.substring(0, 500))
      return [] 
    }

    if (nodesData.code !== 0) {
      console.error('Nodes API Error:', nodesData.msg)
      return []
    }

    const items = nodesData.data?.items || []
    console.log(`Found ${items.length} wiki nodes. Filtering by query: "${query}"`)

    // 简单过滤：标题或摘要包含关键词
    const lowerQuery = query.toLowerCase()
    return items
      .filter((item: any) => {
        const title = (item.title || '').toLowerCase()
        // 支持多关键词匹配 (OR 关系)
        const keywords = query.includes(' OR ') ? query.split(' OR ').map(k => k.trim().toLowerCase()) : [lowerQuery]
        return keywords.some(k => title.includes(k))
      })
      .map((item: any, i: number) => {
        const url = item.url || `https://waytoagi.feishu.cn/wiki/${item.node_token}`
        return {
          id: i,
          title: item.title || '未命名文档',
          url: url,
          update: item.obj_edit_time ? new Date(parseInt(item.obj_edit_time) * 1000).toISOString().split('T')[0] : '',
          summary: `来自知识库节点 · ${item.obj_type === 'docx' ? '文档' : '目录'}`
        }
      })
  } catch (error) {
    console.error('searchDocs error:', error)
    throw error
  }
}

export async function createDocWithContent(title: string, contentBlocks: Array<{type: string, text: string, level?: number}>) {
  try {
    const token = await getTenantToken()

    console.log('Creating Feishu doc:', title)
    const docRes = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    })

    const docText = await docRes.text()
    let docData
    try { docData = JSON.parse(docText) } catch { throw new Error('Invalid doc create response') }
    
    if (docData.code !== 0) throw new Error(`创建文档失败: ${docData.msg}`)

    const docId = docData.data.document.document_id
    const rootBlockId = docData.data.document.root_block_id

    const children = contentBlocks.map(block => {
      if (block.type === 'heading') {
        return {
          block_type: 2,
          heading: { elements: [{ text_run: { content: block.text, text_element_style: {} } }], level: block.level || 1 }
        }
      }
      return {
        block_type: 1,
        text: { elements: [{ text_run: { content: block.text, text_element_style: {} } }], style: {} }
      }
    })

    const appendRes = await fetch(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ children })
    })

    if (WIKI_SPACE_ID) {
      try {
        await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${WIKI_SPACE_ID}/nodes`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ obj_type: 'docx', obj_token: docId })
        })
      } catch (e) { console.warn('Wiki node create failed', e) }
    }

    return `https://waytoagi.feishu.cn/docx/${docId}`
  } catch (error) {
    console.error('createDocWithContent error:', error)
    throw error
  }
}
