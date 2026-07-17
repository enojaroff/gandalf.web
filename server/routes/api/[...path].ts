import { defineEventHandler, getRouterParam, getHeaders, getQuery, proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiEndpoint: string = (config.apiEndpoint as string) || 'https://api.gndf.io/'

  const path = getRouterParam(event, 'path') ?? ''
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

  // proxyRequest streams the incoming body (JSON and multipart alike, the
  // multipart boundary lives in the forwarded content-type header) and the
  // upstream response (JSON and binary downloads alike) without any text
  // decoding — the previous hand-rolled fetch + response.text() corrupted
  // binary Excel downloads and multipart uploads.
  return proxyRequest(event, targetUrl, {
    headers: forwardHeaders,
  })
})
