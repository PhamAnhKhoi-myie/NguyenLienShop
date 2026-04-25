const mongoose = require('mongoose');
const { CHAT_INTENTS, CHAT_CONFIG } = require('./chat.constants');

// Schema cho từng tin nhắn
const messageSchema = new mongoose.Schema({
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true }, // Nội dung hiển thị cho user

    // Lưu trữ phục vụ AI Debug & Retry (Theo nguyên tắc số 3 của bạn)
    raw_ai_response: String,

    parsed_data: {
        intent: {
            type: String,
            enum: Object.values(CHAT_INTENTS),
            default: CHAT_INTENTS.UNKNOWN
        },
        entities: {
            product: String,
            category: String
        },
        confidence: { type: Number, default: 0 }
    },

    metadata: {
        model: { type: String, default: CHAT_CONFIG.DEFAULT_MODEL },
        parse_success: { type: Boolean, default: false },
        latency_ms: Number,
        tokens_used: Number
    },

    created_at: { type: Date, default: Date.now }
});

// Schema cho phiên hội thoại (Session)
const sessionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    context_summary: {
        short_term: String, // Tóm tắt ngắn gọn hội thoại gần nhất
        updated_at: Date
    },
    last_entities: { // Session Memory (Nguyên tắc 3.4 của bạn)
        product: String,
        category: String
    },
    is_deleted: { type: Boolean, default: false },
    last_message_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Áp dụng Soft Delete Pattern (#7)
sessionSchema.pre(/^find/, function () {
    this.where({ is_deleted: false });
});

// ===== INDEXES =====

// Chat message pagination: load conversation history in order
messageSchema.index({ session_id: 1, created_at: -1 });

// Chat session lookup by user (one user can have many sessions)
sessionSchema.index({ user_id: 1 });

const ChatSession = mongoose.model('ChatSession', sessionSchema);
const ChatMessage = mongoose.model('ChatMessage', messageSchema);

module.exports = { ChatSession, ChatMessage };