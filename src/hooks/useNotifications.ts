import { useEffect } from 'react';

export const useNotifications = () => {
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const hasNotified = (key: string) => {
        const notified = JSON.parse(localStorage.getItem('jules_notified_events') || '[]');
        return notified.includes(key);
    };

    const markNotified = (key: string) => {
        const notified = JSON.parse(localStorage.getItem('jules_notified_events') || '[]');
        if (!notified.includes(key)) {
            notified.push(key);
            while (notified.length > 500) notified.shift();
            localStorage.setItem('jules_notified_events', JSON.stringify(notified));
        }
    };

    const notify = (title: string, body: string, url?: string, dedupeKey?: string, timestampStr?: string) => {
        // Feature: Ignore notifications for events older than today
        if (timestampStr) {
            const eventTime = new Date(timestampStr).getTime();
            const startOfToday = new Date().setHours(0, 0, 0, 0);
            if (eventTime < startOfToday) {
                return; // Silently ignore old events
            }
        }

        if (dedupeKey) {
            if (hasNotified(dedupeKey)) return;
            markNotified(dedupeKey);
        }

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

    return { notify, hasNotified, markNotified };
};
