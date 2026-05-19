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
            throw new AppError('Phiên trò chuyện không tồn tại', 404, 'CHAT_SESSION_NOT_FOUND');
        }

        const aiResult = await ChatService.processUserMessage(userId, session_id, message);
        const { intent } = aiResult.parsed_data;

        let replyText = "Tôi có thể giúp gì thêm cho bạn không?";
        let relatedData = null;

        switch (intent) {
            case CHAT_INTENTS.GREETING:
                replyText = "Chào bạn! NguyenLienShop chuyên cung cấp bao bì thực phẩm. Bạn cần tìm loại túi hay màng bọc nào ạ?";
                break;

            case CHAT_INTENTS.ASK_PRICE:
                const productName = aiResult.parsed_data.entities.product;
                if (productName) {
                    const products = await ProductService.searchProducts(productName, 1);
                    const productInfo = products.length > 0 ? products[0] : null;

                    if (productInfo) {
                        replyText = `Sản phẩm ${productInfo.name} hiện có giá từ ${productInfo.min_price.toLocaleString()}đ. Shop đang còn hàng ạ!`;
                        relatedData = productInfo;
                    } else {
                        replyText = `Dạ, shop có kinh doanh sản phẩm liên quan đến "${productName}", nhưng hiện tại mình chưa tìm thấy giá chính xác. Bạn đợi một chút nhân viên sẽ báo giá ngay ạ!`;
                    }
                }
                break;

            case CHAT_INTENTS.SEARCH_PRODUCT:
                const searchProductName = aiResult.parsed_data.entities.product?.trim();
                relatedData = searchProductName
                    ? await ProductService.searchProducts(searchProductName, 5)
                    : [];
                replyText = relatedData.length > 0
                    ? `Tôi tìm thấy một số sản phẩm phù hợp. Bạn xem thử nhé!`
                    : `Hiện shop chưa có sản phẩm nào khớp với yêu cầu của bạn.`;
                break;

            case CHAT_INTENTS.ORDER_STATUS:

                const latestOrder = await OrderService.getLatestOrderByUser(userId);

                if (latestOrder) {
                    const statusMap = {
                        PENDING: 'đang chờ thanh toán',
                        PAID: 'đã thanh toán và đang chờ xử lý',
                        PROCESSING: 'đang được chuẩn bị',
                        SHIPPED: 'đang được giao đến bạn',
                        DELIVERED: 'đã giao thành công',
                        FAILED: 'thanh toán thất bại',
                        CANCELED: 'đã bị hủy'
                    };
                    const normalizedStatus = latestOrder.status?.toUpperCase();
                    const statusText = statusMap[normalizedStatus] || latestOrder.status || 'không xác định';
                    replyText = `Đơn hàng #${latestOrder.id.slice(-6)} của bạn đang ở trạng thái: ${statusText}.`;
                    relatedData = latestOrder;
                } else {
                    replyText = "Dạ, shop kiểm tra thì hiện tại bạn chưa có đơn hàng nào ạ.";
                }
                break;

            default:
                replyText = "Yêu cầu của bạn đang được ghi nhận. Bạn có thể nói rõ hơn về sản phẩm bạn đang quan tâm không?";
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
            title: req.body.title || 'Cuộc trò chuyện mới'
        });

        res.status(201).json({
            success: true,
            data: session
        });
    });
}

module.exports = ChatController;
