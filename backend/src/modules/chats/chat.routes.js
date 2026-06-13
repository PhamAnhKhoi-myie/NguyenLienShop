const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ChatController = require('./chat.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    createSessionBodySchema,
    sendMessageBodySchema,
} = require('./chat.validator');

const chatMessageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user.id,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            code: 'CHAT_RATE_LIMITED',
            message: 'Too many chat messages. Please try again later.',
        });
    },
});


router.use(authenticate);

router.post(
    '/sessions',
    validate({ body: createSessionBodySchema }),
    ChatController.createSession
);

router.post(
    '/message',
    validate({ body: sendMessageBodySchema }),
    chatMessageLimiter,
    ChatController.handleMessage
);

module.exports = router;
