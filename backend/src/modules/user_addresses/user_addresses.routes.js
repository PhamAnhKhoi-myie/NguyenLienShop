// filepath: c:\MyEffort\NguyenLien\backend\src\modules\user_addresses\user_addresses.routes.js
const express = require('express');
const { createAddress, getUserAddresses, setDefaultAddress, updateAddress, deleteAddress } = require('./user_addresses.controller');
const { ZodError } = require("zod");
const { createUserAddressSchema, updateUserAddressSchema } = require("../user_addresses/user_addresses.validator");
const { authenticate } = require('../../middlewares/auth.middleware');
const validate = require("../../middlewares/validate.middleware")

const router = express.Router();


// ===== CREATE ADDRESS =====
router.post(
    '/',
    authenticate,
    validate(createUserAddressSchema),
    createAddress
);

// ===== GET ADDRESSES =====
router.get('/:userId', authenticate, getUserAddresses);

// ===== UPDATE ADDRESS =====
router.patch(
    '/:userId/:addressId',
    authenticate,
    validate(updateUserAddressSchema),
    updateAddress
);

// ===== SET DEFAULT ADDRESS =====
router.patch(
    '/:userId/:addressId/set-default',
    authenticate,
    setDefaultAddress
);

// ===== DELETE ADDRESS =====
router.delete('/:userId/:addressId', authenticate, deleteAddress);

module.exports = router;