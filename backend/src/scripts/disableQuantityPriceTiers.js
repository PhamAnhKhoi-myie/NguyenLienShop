require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../modules/products/product.model");
const Variant = require("../modules/products/variant.model");
const VariantUnit = require("../modules/products/variant_unit.model");

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "nguyenlien_dev";

const getBaseTier = (tiers = []) => {
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return null;
    }

    return [...tiers].sort((left, right) => {
        const leftMin = Number(left.min_qty || 1);
        const rightMin = Number(right.min_qty || 1);
        return leftMin - rightMin;
    })[0];
};

const isSingleBaseTier = (unit, basePrice) => {
    const tiers = unit.price_tiers || [];
    return (
        tiers.length === 1 &&
        Number(tiers[0].min_qty) === 1 &&
        (tiers[0].max_qty === null || tiers[0].max_qty === undefined) &&
        Number(tiers[0].unit_price) === Number(basePrice)
    );
};

const run = async () => {
    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log(`Connected to ${mongoose.connection.name}`);

    const units = await VariantUnit.find({});
    const changedVariantIds = new Set();
    let updatedUnits = 0;
    let skippedUnits = 0;

    for (const unit of units) {
        const baseTier = getBaseTier(unit.price_tiers);

        if (!baseTier) {
            skippedUnits += 1;
            continue;
        }

        const basePrice = Number(baseTier.unit_price || 0);

        if (!Number.isInteger(basePrice) || basePrice <= 0) {
            skippedUnits += 1;
            continue;
        }

        if (isSingleBaseTier(unit, basePrice)) {
            skippedUnits += 1;
            continue;
        }

        unit.price_tiers = [
            {
                min_qty: 1,
                max_qty: null,
                unit_price: basePrice,
            },
        ];

        await unit.save();
        changedVariantIds.add(unit.variant_id.toString());
        updatedUnits += 1;
    }

    const changedProductIds = new Set();

    for (const variantId of changedVariantIds) {
        await Variant.updatePriceCache(variantId);

        const variant = await Variant.findById(variantId, "product_id");
        if (variant?.product_id) {
            changedProductIds.add(variant.product_id.toString());
        }
    }

    for (const productId of changedProductIds) {
        await Product.updatePriceCache(productId);
    }

    console.log(
        JSON.stringify(
            {
                updated_units: updatedUnits,
                skipped_units: skippedUnits,
                recalculated_variants: changedVariantIds.size,
                recalculated_products: changedProductIds.size,
            },
            null,
            2
        )
    );
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
