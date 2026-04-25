const express = require('express');
const router = express.Router();
const ChatController = require('./chat.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

// Tất cả APIs chat yêu cầu login
router.use(authenticate);

router.post('/sessions', ChatController.createSession);
router.post('/message', ChatController.handleMessage);

module.exports = router;