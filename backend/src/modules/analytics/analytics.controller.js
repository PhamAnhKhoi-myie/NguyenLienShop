const asyncHandler = require('../../utils/asyncHandler.util');
const AnalyticsService = require('./analytics.service');

const getDashboardStats = asyncHandler(async (req, res) => {
    const data = await AnalyticsService.getDashboardStats(req.query);

    res.status(200).json({
        success: true,
        data,
    });
});

module.exports = {
    getDashboardStats,
};
