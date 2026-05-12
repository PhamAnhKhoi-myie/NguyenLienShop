const express = require('express');

const {
    createAddress,
    getUserAddressesByAdmin,
    setDefaultAddress,
    updateAddress,
    deleteAddress,
    getMyAddresses
} = require('./user_addresses.controller');

const validate = require("../../middlewares/validate.middleware");

const { authenticate } = require('../../middlewares/auth.middleware');

const {
    authorize
} = require("../../middlewares/authorize.middleware");

const {
    createUserAddressBodySchema,
    updateUserAddressBodySchema,
    userIdParamSchema,
    addressIdParamSchema
} = require("./user_addresses.validator");

const router = express.Router();

// ===== CREATE ADDRESS =====
router.post(
    '/',
    authenticate,
    validate({ body: createUserAddressBodySchema }),
    createAddress
);

// ===== ADMIN =====
router.get(
    '/user/:userId',
    authenticate,
    authorize(["ADMIN"]),
    validate({ params: userIdParamSchema }),
    getUserAddressesByAdmin
);

// ===== OWN ADDRESSES =====
router.get(
    '/',
    authenticate,
    getMyAddresses
);

// ===== SET DEFAULT =====
router.patch(
    '/:addressId/set-default',
    authenticate,
    validate({ params: addressIdParamSchema }),
    setDefaultAddress
);

// ===== UPDATE =====
router.patch(
    '/:addressId',
    authenticate,
    validate({ params: addressIdParamSchema, body: updateUserAddressBodySchema }),
    updateAddress
);

// ===== DELETE =====
router.delete(
    '/:addressId',
    authenticate,
    validate({ params: addressIdParamSchema }),
    deleteAddress
);

module.exports = router;