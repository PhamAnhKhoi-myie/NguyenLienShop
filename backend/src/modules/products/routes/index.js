const express = require('express');
const router = express.Router();

const productRoutes = require('./product.routes');
const variantRoutes = require('./variant.routes');
const variantUnitRoutes = require('./variant_unit.routes');


router.use('/products', productRoutes);


router.use('/products/:productId/variants', variantRoutes);


router.use('/variant-units', variantUnitRoutes);
router.use('/variants/:variantId/units', variantUnitRoutes);

module.exports = router;