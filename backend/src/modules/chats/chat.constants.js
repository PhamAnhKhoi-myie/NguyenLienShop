/**
 * Các ý định (intents) mà chatbot có thể nhận diện
 */
const CHAT_INTENTS = {
    GREETING: 'GREETING',        // Chào hỏi
    ASK_PRICE: 'ASK_PRICE',      // Hỏi giá sản phẩm
    SEARCH_PRODUCT: 'SEARCH_PRODUCT', // Tìm kiếm sản phẩm
    ORDER_STATUS: 'ORDER_STATUS', // Kiểm tra đơn hàng
    UNKNOWN: 'UNKNOWN'           // Không xác định
};

const CHAT_CONFIG = {
    MIN_CONFIDENCE: 0.4,         // Độ tin cậy tối thiểu để chấp nhận intent
    MAX_RETRY: 2,                // Số lần thử lại nếu AI trả về lỗi
    DEFAULT_MODEL: 'gemini-1.5-flash'
};

module.exports = { CHAT_INTENTS, CHAT_CONFIG };