self.addEventListener('push', function(event) {
    if (event.data) {
        let payload;
        try {
            payload = event.data.json();
        } catch (e) {
            payload = { title: 'Notification', body: event.data.text() };
        }
        
        const options = {
            body: payload.body || 'You have a new message.',
            icon: payload.icon || '/logo192.png',
            badge: payload.badge || '/logo192.png',
            vibrate: payload.vibrate || [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(payload.title || 'New Alert', options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // This looks to see if the current is already open and focuses if it is
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
