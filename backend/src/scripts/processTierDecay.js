require('dotenv').config();
const mongoose = require('mongoose');
const LoyaltyService = require('../modules/loyalty/loyalty.service');

const MONGODB_URI = process.env.MONGO_URI;

const run = async () => {
    if (!MONGODB_URI) {
        throw new Error('Missing MONGO_URI in .env');
    }

    await mongoose.connect(MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || 'nguyenlien_dev',
    });

    const result = await LoyaltyService.processTierDecayBatch({
        limit: process.env.LOYALTY_DECAY_BATCH_LIMIT || 200,
    });

    console.log(
        `Processed ${result.processed} users, downgraded ${result.downgraded} users`
    );
};

if (require.main === module) {
    run()
        .catch((error) => {
            console.error('Tier decay processing failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect();
        });
}

module.exports = run;
