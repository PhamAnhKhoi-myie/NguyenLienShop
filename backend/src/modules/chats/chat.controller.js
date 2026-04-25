const ChatService = require('./chat.service');
const ProductService = require('../products/product.service');
const { ChatSession } = require('./chat.model');
const { CHAT_INTENTS } = require('./chat.constants');
const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const OrderService = require('../orders/order.service'); // Import thêm OrderService


class ChatController {
    /**
     * API Gửi tin nhắn và nhận phản hồi từ AI
     */
    static handleMessage = asyncHandler(async (req, res) => {
        const { message, session_id } = req.body;
        const userId = req.user.id; // Lấy từ middleware auth

        // 1. Kiểm tra ownership của session (Security Rule #1)
        const session = await ChatSession.findOne({ _id: session_id, user_id: userId });
        if (!session) {
            throw new AppError('Phiên trò chuyện không tồn tại', 404, 'CHAT_SESSION_NOT_FOUND');
        }

        // 2. Gọi AI Service để phân tích ý định
        const aiMessage = await ChatService.processUserMessage(userId, session_id, message);
        const { intent, entities } = aiMessage.parsed_data;

        // 3. Thực thi Business Logic dựa trên Intent (Source of Truth từ Backend)
        let replyText = "Tôi có thể giúp gì thêm cho bạn không?";
        let relatedData = null;

        switch (intent) {
            case CHAT_INTENTS.GREETING:
                replyText = "Chào bạn! NguyenLienShop chuyên cung cấp bao bì thực phẩm. Bạn cần tìm loại túi hay màng bọc nào ạ?";
                break;

            case CHAT_INTENTS.ASK_PRICE:
                const productName = aiMessage.parsed_data.entities.product;
                if (productName) {
                    // ✅ Sử dụng searchProducts (Fuzzy Search) thay vì searchByName để bao quát hơn
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
                relatedData = await ProductService.listProducts({ query: aiMessage.parsed_data.entities.product });
                replyText = relatedData.length > 0
                    ? `Tôi tìm thấy một số sản phẩm phù hợp. Bạn xem thử nhé!`
                    : `Hiện shop chưa có sản phẩm nào khớp với yêu cầu của bạn.`;
                break;

            case CHAT_INTENTS.ORDER_STATUS:

                const latestOrder = await OrderService.getLatestOrderByUser(userId);

                if (latestOrder) {
                    const statusMap = {
                        'pending': 'đang chờ thanh toán',
                        'confirmed': 'đã xác nhận và đang chuẩn bị hàng',
                        'shipping': 'đang được giao đến bạn',
                        'completed': 'đã hoàn thành',
                        'cancelled': 'đã bị hủy'
                    };
                    replyText = `Đơn hàng #${latestOrder.id.slice(-6)} của bạn đang ở trạng thái: ${statusMap[latestOrder.status]}.`;
                    relatedData = latestOrder;
                } else {
                    replyText = "Dạ, shop kiểm tra thì hiện tại bạn chưa có đơn hàng nào ạ.";
                }
                break;

            default:
                replyText = "Yêu cầu của bạn đang được ghi nhận. Bạn có thể nói rõ hơn về sản phẩm bạn đang quan tâm không?";
        }

        // 4. Update lại nội dung hiển thị cho Assistant Message (Thêm câu trả lời thực tế từ Shop)
        aiMessage.content = replyText;
        await aiMessage.save();

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

    /**
     * Tạo session mới
     */
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