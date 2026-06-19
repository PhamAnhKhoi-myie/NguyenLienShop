const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { STAFF_ROLES } = require('../../constants/roles');
const AnalyticsController = require('./analytics.controller');
const {
    dashboardStatsQuerySchema,
} = require('./analytics.validator');

const router = express.Router();

router.get(
    '/stats',
    authenticate,
    authorize(STAFF_ROLES),
    validate({ query: dashboardStatsQuerySchema }),
    AnalyticsController.getDashboardStats
);

module.exports = router;
