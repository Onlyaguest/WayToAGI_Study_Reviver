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

    console.log('Searching Feishu docs with query:', query)
    const res = await fetch('https://open.feishu.cn/open-apis/search/v2/fetch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        offset: 0,
        limit: 15,
        search_entities: ['docx', 'doc', 'wiki']
      })
    })

    const text = await res.text()
    console.log('Search Response Status:', res.status)

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse search response:', text.substring(0, 500))
      return []
    }

    if (data.code !== 0) {
      console.error('Search API Error:', data.msg, data.code)
      return []
    }

    const items = data.data?.items || []
    return items
      .filter((item: any) => item.hit_entity_type === 'docx' || item.hit_entity_type === 'wiki')
      .slice(0, 10)
      .map((item: any, i: number) => {
        const url = item.url || `https://waytoagi.feishu.cn/wiki/${item.obj_token}`
        return {
          id: i,
          title: item.title?.replace(/<[^>]+>/g, '') || '未命名文档',
          url: url,
          update: item.update_time ? new Date(item.update_time * 1000).toISOString().split('T')[0] : '',
          summary: item.summary?.replace(/<[^>]+>/g, '').substring(0, 100) || ''
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
