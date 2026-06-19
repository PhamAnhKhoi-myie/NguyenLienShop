const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const LoyaltyController = require('./loyalty.controller');

const router = express.Router();

router.get('/me', authenticate, LoyaltyController.getMyLoyalty);
router.get('/me/transactions', authenticate, LoyaltyController.getMyTransactions);
router.post('/admin/decay-tiers', authenticate, LoyaltyController.processTierDecay);

module.exports = router;
