const SHARE_CACHE = 'share-target-v1'

// 共有ターゲット（音声ファイルをiOSの共有シートから受け取る）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // POST /share-target → ファイルをキャッシュして /knowledge?share=1 にリダイレクト
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      event.request.formData().then(async (formData) => {
        const audio = formData.get('audio')
        const title = formData.get('title') || ''
        if (audio && audio instanceof File) {
          const cache = await caches.open(SHARE_CACHE)
          await cache.put('/share-target-file', new Response(audio, {
            headers: {
              'Content-Type': audio.type || 'audio/mpeg',
              'X-File-Name': encodeURIComponent(audio.name || 'recording.m4a'),
              'X-Share-Title': encodeURIComponent(title),
            },
          }))
        }
        return Response.redirect('/knowledge?share=1', 303)
      })
    )
    return
  }

  // GET /share-target-file → ページがキャッシュからファイルを取り出す（1回限り）
  if (url.pathname === '/share-target-file' && event.request.method === 'GET') {
    event.respondWith(
      caches.open(SHARE_CACHE).then(async (cache) => {
        const response = await cache.match('/share-target-file')
        if (response) {
          await cache.delete('/share-target-file')
          return response
        }
        return new Response('not found', { status: 404 })
      })
    )
    return
  }
})

// プッシュ通知
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? '開通表通知', {
      body: data.body ?? '',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: data.tag ?? 'activation',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/activation'))
})
