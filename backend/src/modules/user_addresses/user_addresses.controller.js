const asyncHandler = require('../../utils/asyncHandler.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const { checkOwnershipOrAdmin } = require('../../middlewares/authorize.middleware');
const UserAddressService = require('./user_addresses.service');
const { validateObjectId } = require('../../utils/validator.util');

/**
 * POST /api/v1/user-addresses
 * Create new user address
 * 
 * Authorization: User can only create addresses for themselves
 */
const createAddress = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    // ✅ REMOVE: validateObjectId(user.id) - token is already verified

    // req.body already validated by validate middleware
    const address = await UserAddressService.createAddress(user.id, req.body);

    res.status(201).json({
        success: true,
        data: address,
    });
});

/**
 * GET /api/v1/user-addresses/:userId
 * Get all addresses for user
 * 
 * Authorization: Own addresses or ADMIN
 */
const getUserAddresses = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.userId);  // ✅ KEEP: User input from URL
    checkOwnershipOrAdmin(user.id, req.params.userId, user.roles);

    const addresses = await UserAddressService.getAddressesByUserId(req.params.userId);

    res.status(200).json({
        success: true,
        data: addresses,
    });
});

/**
 * PATCH /api/v1/user-addresses/:userId/:addressId/set-default
 * Set address as default
 * 
 * Authorization: Own addresses or ADMIN
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.userId);     // ✅ KEEP: User input from URL
    validateObjectId(req.params.addressId);  // ✅ KEEP: User input from URL
    checkOwnershipOrAdmin(user.id, req.params.userId, user.roles);

    const address = await UserAddressService.setDefaultAddress(
        req.params.userId,
        req.params.addressId
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

/**
 * PATCH /api/v1/user-addresses/:userId/:addressId
 * Update user address
 * 
 * Authorization: Own addresses or ADMIN
 * Validation: validate middleware checks req.body
 */
const updateAddress = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.userId);     // ✅ KEEP: User input from URL
    validateObjectId(req.params.addressId);  // ✅ KEEP: User input from URL
    checkOwnershipOrAdmin(user.id, req.params.userId, user.roles);

    // req.body already validated by validate middleware
    const address = await UserAddressService.updateAddress(
        req.params.userId,
        req.params.addressId,
        req.body
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

/**
 * DELETE /api/v1/user-addresses/:userId/:addressId
 * Delete user address
 * 
 * Authorization: Own addresses or ADMIN
 */
const deleteAddress = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    validateObjectId(req.params.userId);     // ✅ KEEP: User input from URL
    validateObjectId(req.params.addressId);  // ✅ KEEP: User input from URL
    checkOwnershipOrAdmin(user.id, req.params.userId, user.roles);

    const address = await UserAddressService.deleteAddress(
        req.params.userId,
        req.params.addressId
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

module.exports = {
    createAddress,
    getUserAddresses,
    setDefaultAddress,
    updateAddress,
    deleteAddress,
};