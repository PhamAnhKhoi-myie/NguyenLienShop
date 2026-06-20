const mongoose = require('mongoose');
const { CHAT_INTENTS, CHAT_CONFIG } = require('./chat.constants');


const messageSchema = new mongoose.Schema({
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },


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
        tokens_used: Number,
        intent_source: String,
        ai_error: String
    },

    created_at: { type: Date, default: Date.now }
});


const sessionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    context_summary: {
        short_term: String,
        updated_at: Date
    },
    last_entities: {
        product: String,
        category: String
    },
    is_deleted: { type: Boolean, default: false },
    last_message_at: { type: Date, default: Date.now }
}, { timestamps: true });


sessionSchema.pre(/^find/, function () {
    this.where({ is_deleted: false });
});




messageSchema.index({ session_id: 1, created_at: -1 });


sessionSchema.index({ user_id: 1 });

const ChatSession = mongoose.model('ChatSession', sessionSchema);
const ChatMessage = mongoose.model('ChatMessage', messageSchema);

module.exports = { ChatSession, ChatMessage };
