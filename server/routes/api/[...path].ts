import { defineEventHandler, getRouterParam, getMethod, getHeaders, getQuery, readBody, setResponseStatus, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiEndpoint: string = (config.apiEndpoint as string) || 'https://api.gndf.io/'

  const path = getRouterParam(event, 'path') ?? ''
  const method = getMethod(event)
  const incomingHeaders = getHeaders(event)
  const query = getQuery(event)

  // Build forward headers — exclude hop-by-hop and auto-computed headers
  const forwardHeaders: Record<string, string> = {}
  const skip = new Set(['host', 'connection', 'transfer-encoding', 'te', 'trailers', 'keep-alive', 'upgrade', 'content-length'])
  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (!skip.has(key.toLowerCase()) && value) {
      forwardHeaders[key] = value
    }
  }

  // Build target URL
  const base = apiEndpoint.endsWith('/') ? apiEndpoint.slice(0, -1) : apiEndpoint
  const queryStr = Object.keys(query).length
    ? '?' + new URLSearchParams(query as Record<string, string>).toString()
    : ''
  const targetUrl = `${base}/api/${path}${queryStr}`

  // Parse and re-serialize body for mutating methods to ensure correct encoding
  let bodyStr: string | undefined
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const parsed = await readBody(event)
    if (parsed !== null && parsed !== undefined) {
      bodyStr = JSON.stringify(parsed)
      forwardHeaders['content-type'] = 'application/json'
    }
  }

  const response = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body: bodyStr,
  })

  const responseText = await response.text()

  setResponseStatus(event, response.status)
  const ct = response.headers.get('content-type')
  if (ct) setResponseHeader(event, 'content-type', ct)

  try {
    return JSON.parse(responseText)
  }
  catch {
    return responseText
  }
})
