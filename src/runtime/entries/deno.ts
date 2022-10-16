import '#internal/nitro/virtual/polyfill'
import { nitroApp } from '../app'
import { requestHasBody, useRequestBody } from '../utils'

export async function handler (request: Request, _context) {
  const url = new URL(request.url)
  let body
  if (requestHasBody(request)) {
    body = await useRequestBody(request)
  }

  const r = await nitroApp.localCall({
    url: url.pathname + url.search,
    host: url.hostname,
    protocol: url.protocol,
    // @ts-ignore TODO
    headers: request.headers,
    method: request.method,
    redirect: request.redirect,
    body
  })

  // TODO: fix in runtime/static
  const responseBody = r.status !== 304 ? r.body : null
  return new Response(responseBody, {
    status: r.status,
    statusText: r.statusText
  })
}
