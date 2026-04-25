const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ChatMessage, ChatSession } = require("./chat.model");
const { CHAT_INTENTS, CHAT_CONFIG } = require("./chat.constants");
const AppError = require("../../utils/appError.util");

// Khởi tạo Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: CHAT_CONFIG.DEFAULT_MODEL });

class ChatService {
    /**
     * Xử lý tin nhắn từ User, gọi AI và lưu kết quả
     * Tuân thủ Pattern #6: Static Service
     */
    static async processUserMessage(userId, sessionId, messageText) {
        const startTime = Date.now();

        // 1. Lấy context: Sản phẩm cuối + 5 tin nhắn gần nhất
        const [session, history] = await Promise.all([
            ChatSession.findById(sessionId),
            ChatMessage.find({ session_id: sessionId })
                .sort({ created_at: -1 })
                .limit(5)
                .lean()
        ]);

        const lastProduct = session?.last_entities?.product || "Chưa có";

        // Đảo ngược history để đúng thứ tự thời gian
        const historyContext = history.reverse()
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');

        // 2. Prompt nâng cao với History
        const prompt = `
            Bạn là AI trợ lý bán hàng của NguyenLienShop.
            Lịch sử 5 tin nhắn gần nhất:
            ${historyContext}

            Sản phẩm khách đang hỏi trước đó: "${lastProduct}"

            Tin nhắn mới của khách: "${messageText}"

            Yêu cầu:
            - Phân tích intent (GREETING, ASK_PRICE, SEARCH_PRODUCT, ORDER_STATUS, UNKNOWN).
            - Nếu khách hỏi "đơn hàng của tôi", intent là "ORDER_STATUS".
            - Trả về DUY NHẤT JSON: {"intent": "...", "product": "...", "confidence": ...}
        `;

        try {
            const result = await Promise.race([
                model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000))
            ]);

            const response = await result.response;
            const rawText = response.text();
            const parsed = this._parseAndNormalize(rawText);

            // ✅ Confidence Gate
            if (parsed.confidence < CHAT_CONFIG.MIN_CONFIDENCE) {
                parsed.intent = CHAT_INTENTS.UNKNOWN;
            }

            // ✅ Lưu Assistant Message
            const aiMessage = await ChatMessage.create({
                session_id: sessionId,
                role: 'assistant',
                content: rawText,
                raw_ai_response: rawText,
                parsed_data: {
                    intent: parsed.intent,
                    entities: { product: parsed.product },
                    confidence: parsed.confidence
                },
                metadata: {
                    parse_success: parsed.parse_success,
                    latency_ms: Date.now() - startTime
                }
            });

            // ✅ Cập nhật "Trí nhớ" mới nếu tìm thấy sản phẩm mới
            if (parsed.product && parsed.product !== lastProduct) {
                await ChatSession.findByIdAndUpdate(sessionId, {
                    'last_entities.product': parsed.product,
                    last_message_at: new Date()
                });
            }

            return aiMessage;
        } catch (error) {
            console.error('[AI_ERROR]', { userId, sessionId, error: error.message });
            throw new AppError('AI không phản hồi, thử lại sau', 503, 'AI_SERVICE_ERROR');
        }
    }

    /**
     * Bộ Parser chịu lỗi cao (Robust Parser)
     */
    static _parseAndNormalize(text) {
        let rawJson = null;
        let success = false;

        try {
            // Thử bóc tách JSON bằng Regex (nếu AI trả về ```json ... ```)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                rawJson = JSON.parse(jsonMatch[0]);
                success = true;
            }
        } catch (e) {
            success = false;
        }

        // Chuẩn hóa dữ liệu (Normalization)
        const normalized = {
            intent: (rawJson?.intent || CHAT_INTENTS.UNKNOWN).toUpperCase().trim(),
            product: rawJson?.product || null,
            confidence: rawJson?.confidence || 0,
            parse_success: success
        };

        // Kiểm tra xem intent có nằm trong danh sách cho phép không
        if (!Object.values(CHAT_INTENTS).includes(normalized.intent)) {
            normalized.intent = CHAT_INTENTS.UNKNOWN;
        }

        return normalized;
    }
}

module.exports = ChatService;