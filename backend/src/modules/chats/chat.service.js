const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ChatMessage, ChatSession } = require("./chat.model");
const { CHAT_INTENTS, CHAT_CONFIG } = require("./chat.constants");
const AppError = require("../../utils/appError.util");

let geminiModel = null;

const getGeminiModel = () => {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    if (!geminiModel) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({
            model: CHAT_CONFIG.DEFAULT_MODEL,
        });
    }

    return geminiModel;
};

const PRODUCT_INTENTS = new Set([
    CHAT_INTENTS.ASK_PRICE,
    CHAT_INTENTS.SEARCH_PRODUCT,
]);

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
            throw new AppError("Chat session does not exist", 404, 'CHAT_SESSION_NOT_FOUND');
        }

        await ChatMessage.create({
            session_id: sessionId,
            role: 'user',
            content: messageText
        });

        const lastProduct = session?.last_entities?.product || "Not yet available";

        const historyContext = history.reverse()
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');

        const heuristicResult = this._detectIntentHeuristically(messageText, lastProduct);
        const prompt = `Bạn là bộ phân tích ý định cho trợ lý bán hàng NguyenLienShop.

            5 tin nhắn gần nhất:
            ${historyContext}

            Sản phẩm khách đã hỏi trước đó: "${lastProduct}"

            Tin nhắn mới của khách: "${messageText}"

            Yêu cầu:
            - Chỉ phân tích ý định, không tự trả lời giá, tồn kho, đơn hàng hoặc chính sách.
            - Intent hợp lệ: ${Object.values(CHAT_INTENTS).join(', ')}.
            - ASK_PRICE dùng khi khách hỏi giá, tồn kho, còn hàng, hết hàng của sản phẩm.
            - SEARCH_PRODUCT dùng khi khách muốn tìm/mua/xem sản phẩm.
            - ORDER_STATUS dùng khi khách hỏi đơn hàng, trạng thái đơn, mã đơn.
            - SHIPPING_POLICY dùng khi khách hỏi giao hàng, phí ship, vận chuyển.
            - PAYMENT_POLICY dùng khi khách hỏi thanh toán, COD, VNPAY, PayOS, PayPal.
            - RETURN_POLICY dùng khi khách hỏi đổi trả, hoàn tiền, hàng lỗi.
            - Nếu có tên sản phẩm, trích vào "product"; nếu không có và khách đang hỏi tiếp sản phẩm cũ thì dùng sản phẩm trước đó.
            - Trả về DUY NHẤT JSON: {"intent": "...", "product": "...", "confidence": 0.0}`;

        let rawText = null;
        let parsed = heuristicResult;
        let intentSource = 'rules';
        let aiError = null;

        const model = getGeminiModel();

        if (model) {
            try {
                const result = await Promise.race([
                    model.generateContent(prompt),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000)
                    )
                ]);

                const response = await result.response;
                rawText = response.text();
                const aiParsed = this._parseAndNormalize(rawText, lastProduct);

                if (
                    aiParsed.intent !== CHAT_INTENTS.UNKNOWN &&
                    aiParsed.confidence >= CHAT_CONFIG.MIN_CONFIDENCE
                ) {
                    parsed = this._mergeParsedWithFallback(aiParsed, heuristicResult, lastProduct);
                    intentSource = 'ai';
                }
            } catch (error) {
                aiError = error.message;
                console.error('[AI_ERROR]', { userId, sessionId, error: error.message });
            }
        } else {
            aiError = 'GEMINI_API_KEY_MISSING';
        }

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
                latency_ms: Date.now() - startTime,
                intent_source: intentSource,
                ai_error: aiError
            },
            product_changed: parsed.product && parsed.product !== lastProduct
        };
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

    static _parseAndNormalize(text, lastProduct = null) {
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

        const intent = this._normalizeIntent(rawJson?.intent);
        const product = this._normalizeProduct(rawJson?.product);
        const normalized = {
            intent,
            product,
            confidence: Number(rawJson?.confidence) || 0,
            parse_success: success
        };

        if (PRODUCT_INTENTS.has(normalized.intent) && !normalized.product) {
            normalized.product = this._normalizeProduct(lastProduct);
        }

        return normalized;
    }

    static _mergeParsedWithFallback(parsed, fallback, lastProduct = null) {
        const product =
            this._normalizeProduct(parsed.product) ||
            (PRODUCT_INTENTS.has(parsed.intent)
                ? this._normalizeProduct(fallback.product) ||
                  this._normalizeProduct(lastProduct)
                : null);

        return {
            ...parsed,
            product,
        };
    }

    static _detectIntentHeuristically(messageText, lastProduct = null) {
        const normalizedText = this._normalizeText(messageText);
        const product = this._extractProductCandidate(messageText, lastProduct);

        if (!normalizedText) {
            return this._heuristicResult(CHAT_INTENTS.UNKNOWN, null, 0.1);
        }

        if (this._hasAny(normalizedText, ['don hang', 'ma don', 'trang thai don', 'kiem tra don', 'order cua toi', 'my order'])) {
            return this._heuristicResult(CHAT_INTENTS.ORDER_STATUS, null, 0.85);
        }

        if (this._hasAny(normalizedText, ['phi ship', 'ship', 'giao hang', 'van chuyen', 'freeship', 'mien phi giao'])) {
            return this._heuristicResult(CHAT_INTENTS.SHIPPING_POLICY, null, 0.82);
        }

        if (this._hasAny(normalizedText, ['thanh toan', 'cod', 'vnpay', 'payos', 'paypal', 'chuyen khoan', 'tra tien'])) {
            return this._heuristicResult(CHAT_INTENTS.PAYMENT_POLICY, null, 0.82);
        }

        if (this._hasAny(normalizedText, ['doi tra', 'tra hang', 'hoan tien', 'hang loi', 'bi loi', 'bao hanh', 'doi hang'])) {
            return this._heuristicResult(CHAT_INTENTS.RETURN_POLICY, null, 0.82);
        }

        if (
            this._hasAny(normalizedText, ['xin chao', 'chao', 'hello', 'hi', 'alo']) &&
            normalizedText.length <= 24
        ) {
            return this._heuristicResult(CHAT_INTENTS.GREETING, null, 0.8);
        }

        if (this._hasAny(normalizedText, ['gia', 'bao nhieu', 'con hang', 'ton kho', 'het hang', 'stock'])) {
            return this._heuristicResult(CHAT_INTENTS.ASK_PRICE, product, 0.75);
        }

        if (this._hasAny(normalizedText, ['tim', 'kiem', 'mua', 'can', 'muon', 'co ban', 'san pham', 'tui', 'bao', 'mang', 'cuon'])) {
            return this._heuristicResult(CHAT_INTENTS.SEARCH_PRODUCT, product, 0.65);
        }

        return this._heuristicResult(CHAT_INTENTS.UNKNOWN, null, 0.25);
    }

    static _heuristicResult(intent, product, confidence) {
        return {
            intent,
            product: this._normalizeProduct(product),
            confidence,
            parse_success: false,
        };
    }

    static _normalizeIntent(intent) {
        const normalized = String(intent || CHAT_INTENTS.UNKNOWN).toUpperCase().trim();

        if (!Object.values(CHAT_INTENTS).includes(normalized)) {
            return CHAT_INTENTS.UNKNOWN;
        }

        return normalized;
    }

    static _normalizeProduct(product) {
        const normalized = String(product || '').trim();

        if (
            !normalized ||
            ['null', 'none', 'undefined', 'not yet available', 'not available'].includes(
                normalized.toLowerCase()
            )
        ) {
            return null;
        }

        return normalized.slice(0, 120);
    }

    static _normalizeText(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'd')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    static _hasAny(text, keywords) {
        return keywords.some((keyword) => text.includes(keyword));
    }

    static _extractProductCandidate(messageText, lastProduct = null) {
        const text = String(messageText || '')
            .replace(/[?!.,;:]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const politePrefixes = [
            /^shop\s*(oi|ơi)?\s*/i,
            /^cho\s+(minh|em|anh|chi|chị)\s+hoi\s*/i,
            /^cho\s+(mình|em|anh|chị)\s+hỏi\s*/i,
            /^(minh|mình|toi|tôi|em|anh|chi|chị)\s+(muon|muốn|can|cần)\s*/i,
        ];

        let candidate = politePrefixes.reduce(
            (current, pattern) => current.replace(pattern, ''),
            text
        );

        candidate = candidate
            .replace(/\b(gia|giá|bao nhieu|bao nhiêu|con hang|còn hàng|ton kho|tồn kho|het hang|hết hàng|tim|tìm|kiem|kiếm|mua|san pham|sản phẩm|loai|loại|co ban|có bán|khong|không|ko)\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (candidate.length >= 2) {
            return candidate;
        }

        return lastProduct;
    }
}

module.exports = ChatService;
