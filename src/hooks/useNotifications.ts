import { useEffect } from 'react';

export const useNotifications = () => {
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    const notify = (title: string, body: string, url?: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
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
        }
    };

    return { notify };
};
