import { useEffect } from 'react';

export const useNotifications = () => {
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const notify = (title: string, body: string, url?: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            // Using service worker showNotification is more reliable for PWAs,
            // especially on mobile/Android browsers which may throw "illegal constructor"
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(title, {
                        body,
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png', // Small icon for notification bar
                        data: { url },
                        tag: 'jules-notification', // Replace previous notification of same type
                    });
                });
            } else {
                // Fallback for environments without service worker (e.g. non-PWA dev mode)
                try {
                    const notification = new Notification(title, {
                        body,
                        icon: '/pwa-192x192.png',
                    });
                    if (url) {
                        notification.onclick = () => {
                            window.focus();
                            window.open(url, '_blank');
                        };
                    }
                } catch (e) {
                    console.error('Notification failed:', e);
                }
            }
        }
    };

    return { notify };
};
