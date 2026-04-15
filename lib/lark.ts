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
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Token fetch failed: Invalid JSON') }
  if (data.code !== 0) throw new Error(`Token fetch failed: ${data.msg}`)

  cachedToken = data.tenant_access_token
  tokenExpireTime = Date.now() + (data.expire - 300) * 1000
  return cachedToken
}

async function fetchWikiNodes(spaceId: string, parentToken: string = '', pageToken: string = '') {
  const token = await getTenantToken()
  const url = new URL(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${spaceId}/nodes`)
  if (parentToken) url.searchParams.set('parent_node_token', parentToken)
  else url.searchParams.set('page_token', 'root')
  if (pageToken) url.searchParams.set('page_token', pageToken)
  url.searchParams.set('page_size', '50')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { code: 1, data: { items: [], has_more: false } } }
}

async function crawlWikiNodes(spaceId: string, parentToken: string = '', depth: number = 0, maxDepth: number = 2): Promise<any[]> {
  if (depth > maxDepth) return []

  let allNodes: any[] = []
  let pageToken = ''
  let hasMore = true

  while (hasMore) {
    const data = await fetchWikiNodes(spaceId, parentToken, pageToken)
    if (data.code !== 0) {
      console.warn('Failed to fetch nodes:', data.msg)
      break
    }

    const items = data.data?.items || []
    allNodes.push(...items)
    hasMore = data.data?.has_more
    pageToken = data.data?.page_token

    if (hasMore) await new Promise(r => setTimeout(r, 100)) // Rate limit safety
  }

  // Recursively fetch children
  for (const node of allNodes) {
    if (node.has_child) {
      const children = await crawlWikiNodes(spaceId, node.node_token, depth + 1, maxDepth)
      allNodes = [...allNodes, ...children]
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return allNodes
}

export async function searchDocs(query: string) {
  try {
    console.log(`Starting deep crawl for space: ${WIKI_SPACE_ID}, query: "${query}"`)
    const allNodes = await crawlWikiNodes(WIKI_SPACE_ID, '', 0, 2)
    console.log(`Crawled ${allNodes.length} total nodes.`)

    const lowerQuery = query.toLowerCase()
    const keywords = query.includes(' OR ') 
      ? query.split(' OR ').map(k => k.trim().toLowerCase()) 
      : [lowerQuery]

    // Filter nodes that match keywords in title or summary
    // Note: Feishu wiki nodes API doesn't return summary, we'll use title only.
    const matched = allNodes.filter((item: any) => {
      const title = (item.title || '').toLowerCase()
      return keywords.some(k => title.includes(k))
    })

    console.log(`Matched ${matched.length} nodes.`)

    return matched.map((item: any, i: number) => ({
      id: i,
      title: item.title || '未命名文档',
      url: item.url || `https://waytoagi.feishu.cn/wiki/${item.node_token}`,
      update: item.obj_edit_time ? new Date(parseInt(item.obj_edit_time) * 1000).toISOString().split('T')[0] : '',
      summary: `类型: ${item.obj_type === 'docx' ? '文档' : '目录'} · 来自知识库`
    }))
  } catch (error) {
    console.error('searchDocs error:', error)
    throw error
  }
}

export async function createDocWithContent(title: string, results: any[]) {
  try {
    const token = await getTenantToken()
    console.log('Creating Feishu doc:', title)

    const docRes = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    const docData = await docRes.json()
    if (docData.code !== 0) throw new Error(`Create doc failed: ${docData.msg}`)

    const docId = docData.data.document.document_id
    const rootBlockId = docData.data.document.root_block_id

    // Build content blocks
    const blocks: any[] = [
      { block_type: 1, text: { elements: [{ text_run: { content: `📚 为你精选了 ${results.length} 篇相关文章：`, text_element_style: {} } }], style: {} } },
      { block_type: 1, text: { elements: [{ text_run: { content: '', text_element_style: {} } }], style: {} } } // Empty line
    ]

    // Add each result
    results.forEach((r: any, i: number) => {
      blocks.push({
        block_type: 2,
        heading: { level: 2, elements: [{ text_run: { content: `${i + 1}. ${r.title}`, text_element_style: {} } }] }
      })
      blocks.push({
        block_type: 4,
        text: {
          elements: [
            { text_run: { content: '🔗 链接: ', text_element_style: {} } },
            { text_run: { content: r.url, text_element_style: { link: { url: r.url } } } }
          ],
          style: {}
        }
      })
      if (r.summary) {
        blocks.push({
          block_type: 4,
          text: { elements: [{ text_run: { content: `📝 ${r.summary}`, text_element_style: {} } }], style: {} }
        })
      }
      blocks.push({ block_type: 1, text: { elements: [{ text_run: { content: '', text_element_style: {} } }], style: {} } })
    })

    // Append blocks
    await fetch(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${rootBlockId}/children`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ children: blocks })
    })

    return `https://waytoagi.feishu.cn/docx/${docId}`
  } catch (error) {
    console.error('createDocWithContent error:', error)
    throw error
  }
}
