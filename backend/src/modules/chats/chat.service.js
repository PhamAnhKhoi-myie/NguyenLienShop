const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ChatMessage, ChatSession } = require("./chat.model");
const { CHAT_INTENTS, CHAT_CONFIG } = require("./chat.constants");
const AppError = require("../../utils/appError.util");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: CHAT_CONFIG.DEFAULT_MODEL });

class ChatService {
    static async processUserMessage(userId, sessionId, messageText) {
        const startTime = Date.now();

        const [session, history] = await Promise.all([
            ChatSession.findById(sessionId),
            ChatMessage.find({ session_id: sessionId })
                .sort({ created_at: -1 })
                .limit(5)
                .lean()
        ]);

        if (!session) {
            throw new AppError('Phiên trò chuyện không tồn tại', 404, 'CHAT_SESSION_NOT_FOUND');
        }

        await ChatMessage.create({
            session_id: sessionId,
            role: 'user',
            content: messageText
        });

        const lastProduct = session?.last_entities?.product || "Chưa có";

        const historyContext = history.reverse()
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');

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

            if (parsed.confidence < CHAT_CONFIG.MIN_CONFIDENCE) {
                parsed.intent = CHAT_INTENTS.UNKNOWN;
            }

            return {
                raw_ai_response: rawText,
                parsed_data: {
                    intent: parsed.intent,
                    entities: { product: parsed.product },
                    confidence: parsed.confidence
                },
                metadata: {
                    parse_success: parsed.parse_success,
                    latency_ms: Date.now() - startTime
                },
                product_changed: parsed.product && parsed.product !== lastProduct
            };
        } catch (error) {
            console.error('[AI_ERROR]', { userId, sessionId, error: error.message });
            throw new AppError('AI không phản hồi, thử lại sau', 503, 'AI_SERVICE_ERROR');
        }
    }

    static async saveAssistantMessage(sessionId, content, aiResult) {
        const aiMessage = await ChatMessage.create({
            session_id: sessionId,
            role: 'assistant',
            content,
            raw_ai_response: aiResult.raw_ai_response,
            parsed_data: aiResult.parsed_data,
            metadata: aiResult.metadata
        });

        const sessionUpdate = {
            last_message_at: new Date()
        };

        const product = aiResult.parsed_data?.entities?.product;
        if (aiResult.product_changed && product) {
            sessionUpdate['last_entities.product'] = product;
        }

        await ChatSession.findByIdAndUpdate(sessionId, sessionUpdate);

        return aiMessage;
    }

    static _parseAndNormalize(text) {
        let rawJson = null;
        let success = false;

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                rawJson = JSON.parse(jsonMatch[0]);
                success = true;
            }
        } catch (e) {
            success = false;
        }

        const normalized = {
            intent: (rawJson?.intent || CHAT_INTENTS.UNKNOWN).toUpperCase().trim(),
            product: rawJson?.product || null,
            confidence: rawJson?.confidence || 0,
            parse_success: success
        };

        if (!Object.values(CHAT_INTENTS).includes(normalized.intent)) {
            normalized.intent = CHAT_INTENTS.UNKNOWN;
        }

        return normalized;
    }
}

module.exports = ChatService;
