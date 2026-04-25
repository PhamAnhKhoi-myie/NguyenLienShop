const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ['order', 'system', 'promotion'],
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        // Structured data (replaces free-form data)
        data: {
            ref_type: {
                type: String,
                enum: ['order', 'payment', 'discount', 'product', null],
                default: null
            },
            ref_id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            extra: mongoose.Schema.Types.Mixed
        },

        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'low',
            index: true
        },

        // Replaces is_read (single source of truth)
        read_at: {
            type: Date,
            default: null,
            index: true
        },

        // Delivery tracking
        delivered_at: {
            type: Date,
            default: Date.now,
            index: true
        },

        // Soft delete
        deleted_at: {
            type: Date,
            default: null
        },

        // TTL expiration
        expire_at: {
            type: Date,
            default: null
        },

        created_at: {
            type: Date,
            default: Date.now,
            index: -1
        }
    },
    {
        timestamps: false,
        collection: 'notifications'
    }
);

// ✅ Auto-exclude deleted notifications from all finds
notificationSchema.pre(/^find/, function () {
    if (this.getOptions()._recursed) return;
    this.where({ deleted_at: null });
});

// ✅ Compound index for critical queries
notificationSchema.index(
    { user_id: 1, created_at: -1 },
    { name: 'idx_user_created' }
);

// ✅ Unread filter (user_id + read_at status)
notificationSchema.index(
    { user_id: 1, read_at: 1, created_at: -1 },
    { name: 'idx_user_unread' }
);

// ✅ Type filtering (user + type + newest)
notificationSchema.index(
    { user_id: 1, type: 1, created_at: -1 },
    { name: 'idx_user_type' }
);

// ✅ TTL index for auto-cleanup (expires after 0 seconds past expire_at)
notificationSchema.index(
    { expire_at: 1 },
    { expireAfterSeconds: 0, sparse: true, name: 'idx_ttl_expire' }
);

// ✅ Partial index for soft delete optimization
notificationSchema.index(
    { user_id: 1, deleted_at: 1 },
    { name: 'idx_user_deleted', sparse: true }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;