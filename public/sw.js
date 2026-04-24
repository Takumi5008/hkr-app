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
