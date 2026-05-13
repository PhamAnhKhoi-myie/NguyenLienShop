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

        read_at: {
            type: Date,
            default: null,
            index: true
        },

        delivered_at: {
            type: Date,
            default: Date.now,
            index: true
        },

        deleted_at: {
            type: Date,
            default: null
        },

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

notificationSchema.pre(/^find/, function () {
    if (this.getOptions()._recursed) return;
    this.where({ deleted_at: null });
});

notificationSchema.index(
    { user_id: 1, created_at: -1 },
    { name: 'idx_user_created' }
);

notificationSchema.index(
    { user_id: 1, read_at: 1, created_at: -1 },
    { name: 'idx_user_unread' }
);

notificationSchema.index(
    { user_id: 1, type: 1, created_at: -1 },
    { name: 'idx_user_type' }
);

notificationSchema.index(
    { expire_at: 1 },
    { expireAfterSeconds: 0, sparse: true, name: 'idx_ttl_expire' }
);

notificationSchema.index(
    { user_id: 1, deleted_at: 1 },
    { name: 'idx_user_deleted', sparse: true }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;