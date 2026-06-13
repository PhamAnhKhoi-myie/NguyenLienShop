const ChatService = require('./chat.service');
const ProductService = require('../products/product.service');
const { ChatSession } = require('./chat.model');
const { CHAT_INTENTS } = require('./chat.constants');
const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const OrderService = require('../orders/order.service');


class ChatController {
    static handleMessage = asyncHandler(async (req, res) => {
        const { message, session_id } = req.body;
        const userId = req.user.id;

        const session = await ChatSession.findOne({ _id: session_id, user_id: userId });
        if (!session) {
            throw new AppError("Chat session does not exist", 404, 'CHAT_SESSION_NOT_FOUND');
        }

        const aiResult = await ChatService.processUserMessage(userId, session_id, message);
        const { intent } = aiResult.parsed_data;

        let replyText = "Can I help you further?";
        let relatedData = null;

        switch (intent) {
            case CHAT_INTENTS.GREETING:
                replyText = "Hello! NguyenLienShop specializes in providing food packaging. What type of bag or wrap do you need to look for?";
                break;

            case CHAT_INTENTS.ASK_PRICE:
                const productName = aiResult.parsed_data.entities.product;
                if (productName) {
                    const products = await ProductService.searchProducts(productName, 1);
                    const productInfo = products.length > 0 ? products[0] : null;

                    if (productInfo) {
                        replyText = `Product ${productInfo.name} is currently priced from ${productInfo.min_price.toLocaleString()}VND. The shop is still in stock!`;
                        relatedData = productInfo;
                    } else {
                        replyText = `The shop carries products related to "${productName}", but an exact price is not currently available. Please wait a moment while a staff member prepares a quote.`;
                    }
                }
                break;

            case CHAT_INTENTS.SEARCH_PRODUCT:
                const searchProductName = aiResult.parsed_data.entities.product?.trim();
                relatedData = searchProductName
                    ? await ProductService.searchProducts(searchProductName, 5)
                    : [];
                replyText = relatedData.length > 0
                    ? `I found some suitable products. Please check it out!`
                    : `Currently the shop does not have any products that match your request.`;
                break;

            case CHAT_INTENTS.ORDER_STATUS:

                const latestOrder = await OrderService.getLatestOrderByUser(userId);

                if (latestOrder) {
                    const statusMap = {
                        PENDING: "awaiting payment",
                        PAID: "paid and pending",
                        PROCESSING: "is being prepared",
                        SHIPPED: "is being delivered to you",
                        DELIVERED: "delivered successfully",
                        FAILED: "payment failed",
                        CANCELED: "was canceled"
                    };
                    const normalizedStatus = latestOrder.status?.toUpperCase();
                    const statusText = statusMap[normalizedStatus] || latestOrder.status || "undefined";
                    replyText = `Your order #${latestOrder.id.slice(-6)} is in status: ${statusText}.`;
                    relatedData = latestOrder;
                } else {
                    replyText = "Yes, the shop checked and you currently do not have any orders.";
                }
                break;

            default:
                replyText = "Your request is being processed. Can you tell more about the product you are interested in?";
        }

        await ChatService.saveAssistantMessage(session_id, replyText, aiResult);

        res.status(200).json({
            success: true,
            data: {
                role: 'assistant',
                content: replyText,
                intent: intent,
                related_data: relatedData
            }
        });
    });

    static createSession = asyncHandler(async (req, res) => {
        const session = await ChatSession.create({
            user_id: req.user.id,
            title: req.body.title || "New conversation"
        });

        res.status(201).json({
            success: true,
            data: session
        });
    });
}

module.exports = ChatController;
