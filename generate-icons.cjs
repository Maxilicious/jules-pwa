const sharp = require('sharp');

async function processIcon() {
    try {
        // Generate pwa-192x192.png
        await sharp('public/new-logo.png')
            .resize({
                width: 192,
                height: 192,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile('public/pwa-192x192.png');

        // Generate pwa-512x512.png
        await sharp('public/new-logo.png')
            .resize({
                width: 512,
                height: 512,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile('public/pwa-512x512.png');

        // Generate apple-touch-icon.png (standard size 180x180)
        // Apple icons usually don't support transparency well (rendered as black), so we use a white background.
        await sharp('public/new-logo.png')
            .resize({
                width: 180,
                height: 180,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFile('public/apple-touch-icon.png');

        console.log('Icons (PWA and Apple Touch) generated successfully!');
    } catch (error) {
        console.error('Error processing icon:', error);
        process.exit(1);
    }
}

processIcon();
