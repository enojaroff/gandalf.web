import { defineEventHandler, getRouterParam, getMethod, getHeaders, getQuery, readRawBody, proxyRequest, setResponseStatus, setResponseHeader } from 'h3'

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

  // Default path: stream the request body and the upstream response verbatim.
  // proxyRequest forwards JSON, multipart and binary payloads without any text
  // decoding, so uploads keep their multipart boundary and downloads keep their
  // bytes intact. Only a JSON body needs special handling (below), so anything
  // that is not explicitly application/json — including multipart uploads and
  // bodyless requests — goes through here untouched.
  const contentType = (forwardHeaders['content-type'] ?? '').toLowerCase()
  const isJsonBody = contentType.includes('application/json')

  if (!isJsonBody) {
    return proxyRequest(event, targetUrl, { headers: forwardHeaders })
  }

  // JSON body: read the raw bytes (NOT readBody, which would parse+lose fidelity
  // and can mangle number/precision) and forward them as-is. We still parse the
  // upstream response as JSON when it is JSON, and stream everything else so a
  // binary download is never corrupted by text decoding.
  const rawBody = await readRawBody(event)

  const response = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body: rawBody ?? undefined,
  })

  setResponseStatus(event, response.status)
  const responseCt = response.headers.get('content-type')
  if (responseCt) setResponseHeader(event, 'content-type', responseCt)

  // Only decode as text when the response is textual; stream binary verbatim.
  if (responseCt && responseCt.includes('application/json')) {
    const text = await response.text()
    try {
      return JSON.parse(text)
    }
    catch {
      return text
    }
  }

  // Non-JSON (or unknown) response: return the raw bytes untouched.
  return new Uint8Array(await response.arrayBuffer())
})
