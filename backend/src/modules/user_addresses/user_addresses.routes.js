// filepath: c:\MyEffort\NguyenLien\backend\src\modules\user_addresses\user_addresses.routes.js
const express = require('express');
const { createAddress, getUserAddressesByAdmin, setDefaultAddress, updateAddress, deleteAddress, getMyAddresses } = require('./user_addresses.controller');
const { ZodError } = require("zod");
const { createUserAddressSchema, updateUserAddressSchema } = require("../user_addresses/user_addresses.validator");
const { authenticate } = require('../../middlewares/auth.middleware');
const validate = require("../../middlewares/validate.middleware")
const {
    authorize
} = require("../../middlewares/authorize.middleware");

const router = express.Router();


// ===== CREATE ADDRESS =====
router.post(
    '/',
    authenticate,
    validate(createUserAddressSchema),
    createAddress
);

router.get(
    '/user/:userId',
    authenticate,
    authorize(["ADMIN"]),
    getUserAddressesByAdmin
);

// GET addresses của chính mình
router.get('/', authenticate, getMyAddresses);

// SET DEFAULT
router.patch(
    '/:addressId/set-default',
    authenticate,
    setDefaultAddress
);

// UPDATE
router.patch(
    '/:addressId',
    authenticate,
    validate(updateUserAddressSchema),
    updateAddress
);

// DELETE
router.delete('/:addressId', authenticate, deleteAddress);

module.exports = router;