require('dotenv').config();

const { PayOS } = require('@payos/node');

const requiredKeys = [
    'PAYOS_CLIENT_ID',
    'PAYOS_API_KEY',
    'PAYOS_CHECKSUM_KEY',
    'PAYOS_WEBHOOK_URL',
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
    console.error(JSON.stringify({
        success: false,
        error: 'PAYOS_CONFIG_MISSING',
        missingKeys,
    }));
    process.exit(1);
}

const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

payos.webhooks
    .confirm(process.env.PAYOS_WEBHOOK_URL)
    .then((result) => {
        console.log(JSON.stringify({
            success: true,
            data: result,
        }, null, 2));
    })
    .catch((error) => {
        console.error(JSON.stringify({
            success: false,
            error: error.message,
            code: error.code,
            status: error.status,
        }, null, 2));
        process.exit(1);
    });
