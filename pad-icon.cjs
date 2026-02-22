const sharp = require('sharp');

async function processIcon() {
    try {
        const paddedBuffer = await sharp('public/new-logo.png')
            .resize({
                width: 350,
                height: 350,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .extend({
                top: 81,
                bottom: 81,
                left: 81,
                right: 81,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toBuffer();

        await sharp(paddedBuffer)
            .resize(512, 512)
            .toFile('public/pwa-512x512.png');

        await sharp(paddedBuffer)
            .resize(192, 192)
            .toFile('public/pwa-192x192.png');

        console.log('Icons resized and padded successfully!');
    } catch (error) {
        console.error('Error processing icon:', error);
    }
}

processIcon();
