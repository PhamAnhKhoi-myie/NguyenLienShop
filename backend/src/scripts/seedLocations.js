require('dotenv').config();
const mongoose = require('mongoose');
const LocationProvince = require('../modules/locations/location_province.model');
const LocationWard = require('../modules/locations/location_ward.model');
const locationsData = require('../data/vietnam_locations_2025.json');

const seedLocations = async () => {
    const source = locationsData.source;
    const effectiveFrom = new Date(`${locationsData.effective_from}T00:00:00.000Z`);
    const provinces = locationsData.provinces;
    const wards = provinces.flatMap((province) =>
        province.wards.map((ward) => ({
            ...ward,
            province_code: province.code,
            province_name: province.name,
        }))
    );

    const provinceCodes = provinces.map((province) => province.code);
    const wardCodes = wards.map((ward) => ward.code);

    await LocationProvince.updateMany(
        { source, code: { $nin: provinceCodes } },
        { $set: { is_active: false } }
    );

    await LocationWard.updateMany(
        { source, code: { $nin: wardCodes } },
        { $set: { is_active: false } }
    );

    await LocationProvince.bulkWrite(
        provinces.map((province) => ({
            updateOne: {
                filter: { code: province.code },
                update: {
                    $set: {
                        code: province.code,
                        name: province.name,
                        type: province.type,
                        display_order: province.display_order,
                        is_active: true,
                        source,
                        effective_from: effectiveFrom,
                    },
                },
                upsert: true,
            },
        })),
        { ordered: false }
    );

    await LocationWard.bulkWrite(
        wards.map((ward) => ({
            updateOne: {
                filter: { code: ward.code },
                update: {
                    $set: {
                        code: ward.code,
                        name: ward.name,
                        type: ward.type,
                        province_code: ward.province_code,
                        province_name: ward.province_name,
                        display_order: ward.display_order,
                        is_active: true,
                        source,
                        effective_from: effectiveFrom,
                    },
                },
                upsert: true,
            },
        })),
        { ordered: false }
    );

    console.log(`Locations seeded: ${provinces.length} provinces, ${wards.length} wards`);

    return {
        provinces: provinces.length,
        wards: wards.length,
    };
};

if (require.main === module) {
    const run = async () => {
        const MONGODB_URI = process.env.MONGO_URI;

        if (!MONGODB_URI) {
            throw new Error('Missing MONGO_URI in .env');
        }

        try {
            await mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME || 'nguyenlien_db',
            });

            await seedLocations();
        } catch (error) {
            console.error('Seed locations failed:', error);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
        }
    };

    run();
}

module.exports = seedLocations;
