const asyncHandler = require('../../utils/asyncHandler.util');
const { assertAuthenticated, assertRole } = require('../../utils/auth.util');
const { ORDER_MANAGER_ROLES } = require('../../constants/roles');
const LoyaltyService = require('./loyalty.service');

const getMyLoyalty = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const data = await LoyaltyService.getSummary(user.userId);

    res.status(200).json({
        success: true,
        data,
    });
});

const getMyTransactions = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);

    const result = await LoyaltyService.getTransactions(user.userId, req.query);

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
});

const processTierDecay = asyncHandler(async (req, res) => {
    const user = assertAuthenticated(req.user);
    assertRole(user, ORDER_MANAGER_ROLES);

    const result = await LoyaltyService.processTierDecayBatch(req.body || {});

    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    getMyLoyalty,
    getMyTransactions,
    processTierDecay,
};
