const express = require('express');
const ShopInfoController = require('./shop_info.controller');
const { createShopInfoSchema, updateShopInfoSchema } = require('./shop_info.validator');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');


const router = express.Router();

router.get('/', ShopInfoController.getShopInfo);

router.get('/contact', ShopInfoController.getContactInfo);

router.get('/hours', ShopInfoController.getWorkingHours);

router.get('/social', ShopInfoController.getSocialLinks);

router.get('/is-open', ShopInfoController.isShopOpen);

router.get('/next-opening', ShopInfoController.getNextOpeningTime);

/**
 * ADMIN ROUTES (Authentication required)
 */
router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(createShopInfoSchema),
    ShopInfoController.createShopInfo
);

router.patch(
    '/',
    authenticate,
    authorize(['ADMIN']),
    validate(updateShopInfoSchema),
    ShopInfoController.updateShopInfo
);

router.patch(
    '/status',
    authenticate,
    authorize(['ADMIN']),
    ShopInfoController.toggleShopStatus
);

module.exports = router;