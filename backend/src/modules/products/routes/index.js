const express = require('express');
const router = express.Router();

const productRoutes = require('./product.routes');
const variantRoutes = require('./variant.routes');
const variantUnitRoutes = require('./variant_unit.routes');

// ===== PRODUCTS =====
router.use('/products', productRoutes);

// ===== VARIANTS =====
router.use('/variants', variantRoutes);
router.use('/products/:productId/variants', variantRoutes);

// ===== VARIANT UNITS =====
router.use('/variant-units', variantUnitRoutes);
router.use('/variants/:variantId/units', variantUnitRoutes);

module.exports = router;