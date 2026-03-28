/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

const OFFLINE_URL = '/offline.html'
const APP_SHELL_URL = '/index.html'
const RUNTIME_CACHE_NAME = 'mensabot-runtime-v1'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.navigationPreload?.enable())
})

registerRoute(
  new NavigationRoute(createHandlerBoundToURL(APP_SHELL_URL), {
    denylist: [/^\/api(?:\/|$)/],
  }),
)

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api') &&
    url.pathname !== '/service-worker.js' &&
    ['font', 'image', 'script', 'style', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: RUNTIME_CACHE_NAME,
  }),
)

setCatchHandler(async ({ request }) => {
  if (request.destination !== 'document') {
    return Response.error()
  }

  const appShellResponse = await matchPrecache(APP_SHELL_URL)
  if (appShellResponse) {
    return appShellResponse
  }

  const offlineResponse = await matchPrecache(OFFLINE_URL)

  if (!offlineResponse) {
    return new Response('Mensabot is offline.', {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=UTF-8',
      },
      status: 200,
    })
  }

  const offlineBody = await offlineResponse.blob()

  return new Response(offlineBody, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': offlineResponse.headers.get('Content-Type') ?? 'text/html; charset=UTF-8',
    },
    status: 200,
  })
})
