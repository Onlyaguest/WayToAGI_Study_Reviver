const FEISHU_APP_ID = process.env.FEISHU_APP_ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET
const WIKI_SPACE_ID = process.env.FEISHU_WIKI_SPACE_ID || '7226178700923011075'

let cachedToken: string | null = null
let tokenExpireTime = 0

async function getTenantToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpireTime) return cachedToken

  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  })

  const data = await res.json()
  if (data.code !== 0) throw new Error(`获取 Token 失败: ${data.msg}`)

  cachedToken = data.tenant_access_token
  tokenExpireTime = Date.now() + (data.expire - 300) * 1000
  return cachedToken
}

export async function searchDocs(query: string) {
  const token = await getTenantToken()

  // Feishu Search v2 API
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

  const data = await res.json()
  if (data.code !== 0) {
    console.error('Search API error:', data.msg)
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
}

export async function createDocWithContent(title: string, contentBlocks: Array<{type: string, text: string, level?: number}>) {
  const token = await getTenantToken()

  // 1. Create Document
  const docRes = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  })

  const docData = await docRes.json()
  if (docData.code !== 0) throw new Error(`创建文档失败: ${docData.msg}`)

  const docId = docData.data.document.document_id
  const rootBlockId = docData.data.document.root_block_id

  // 2. Append Content Blocks
  // We append children to the root block
  const children = contentBlocks.map(block => {
    if (block.type === 'heading') {
      return {
        block_type: 2, // Heading
        heading: {
          elements: [{ text_run: { content: block.text, text_element_style: {} } }],
          level: block.level || 1
        }
      }
    }
    return {
      block_type: 1, // Text
      text: {
        elements: [{ text_run: { content: block.text, text_element_style: {} } }],
        style: {}
      }
    }
  })

  const appendRes = await fetch(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ children })
  })

  const appendData = await appendRes.json()
  if (appendData.code !== 0) {
    console.warn('添加内容部分失败:', appendData.msg)
  }

  // 3. Create Wiki Node (optional but recommended to appear in Knowledge Base)
  // Only if WIKI_SPACE_ID is set
  if (WIKI_SPACE_ID) {
    try {
      await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${WIKI_SPACE_ID}/nodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          obj_type: 'docx',
          obj_token: docId
        })
      })
    } catch (e) {
      console.warn('添加到知识库失败 (不影响文档访问)', e)
    }
  }

  return `https://waytoagi.feishu.cn/docx/${docId}`
}
