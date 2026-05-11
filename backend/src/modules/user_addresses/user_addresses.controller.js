const asyncHandler = require('../../utils/asyncHandler.util');
const { assertAuthenticated } = require('../../utils/auth.util');
const UserAddressService = require('./user_addresses.service');
const { validateObjectId } = require('../../utils/validator.util');
const { buildAuditMetadata } = require('../../utils/audit.util');

const createAddress = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const user = assertAuthenticated(req.user);

    const address = await UserAddressService.createAddress(
        user.id,
        req.body,
        metadata
    );

    res.status(201).json({
        success: true,
        data: address,
    });
});

const getUserAddressesByAdmin = asyncHandler(async (req, res) => {
    validateObjectId(req.params.userId);

    const addresses = await UserAddressService.getAddressesByUserId(
        req.params.userId
    );

    res.status(200).json({
        success: true,
        data: addresses,
    });
});

const getMyAddresses = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const addresses = await UserAddressService.getAddressesByUserId(user.id);

    res.status(200).json({
        success: true,
        data: addresses,
    });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const user = assertAuthenticated(req.user);

    validateObjectId(req.params.addressId);

    const address = await UserAddressService.setDefaultAddress(
        user.id,
        req.params.addressId,
        metadata
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

const updateAddress = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const user = assertAuthenticated(req.user);

    validateObjectId(req.params.addressId);

    const address = await UserAddressService.updateAddress(
        user.id,
        req.params.addressId,
        req.body,
        metadata
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

const deleteAddress = asyncHandler(async (req, res) => {
    const metadata = buildAuditMetadata(req);
    const user = assertAuthenticated(req.user);

    validateObjectId(req.params.addressId);

    const address = await UserAddressService.deleteAddress(
        user.id,
        req.params.addressId,
        user.id,
        metadata
    );

    res.status(200).json({
        success: true,
        data: address,
    });
});

module.exports = {
    createAddress,
    setDefaultAddress,
    updateAddress,
    deleteAddress,
    getMyAddresses,
    getUserAddressesByAdmin,
};