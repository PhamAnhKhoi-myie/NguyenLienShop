const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_LEVELS } = require('../../../constants/audit');

const SHOP_CONTENT_ACTIONS = [
    AUDIT_ACTIONS.CREATE_BANNER,
    AUDIT_ACTIONS.UPDATE_BANNER,
    AUDIT_ACTIONS.DELETE_BANNER_SOFT,
    AUDIT_ACTIONS.RESTORE_BANNER,
    AUDIT_ACTIONS.CREATE_ANNOUNCEMENT,
    AUDIT_ACTIONS.UPDATE_ANNOUNCEMENT,
    AUDIT_ACTIONS.DELETE_ANNOUNCEMENT_SOFT,
    AUDIT_ACTIONS.RESTORE_ANNOUNCEMENT,
    AUDIT_ACTIONS.CREATE_SHOP_INFO,
    AUDIT_ACTIONS.UPDATE_SHOP_INFO,
    AUDIT_ACTIONS.UPDATE_SHOP_INFO_STATUS,
];

const TARGET_TYPES = ['BANNER', 'ANNOUNCEMENT', 'SHOP_INFO'];
const ACTOR_TYPES = ['ADMIN', 'USER', 'SYSTEM', 'INTERNAL'];

const schema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    actor_type: { type: String, enum: ACTOR_TYPES, default: 'ADMIN' },

    action: { type: String, enum: SHOP_CONTENT_ACTIONS, required: true },

    level: { type: String, enum: AUDIT_LEVELS, required: true },

    target_type: { type: String, enum: TARGET_TYPES, required: true },

    banner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Banner', default: null },

    announcement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', default: null },

    shop_info_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopInfo', default: null },

    display_name: { type: String, default: null },

    public_status: { type: String, default: null },

    changes: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

schema.index({ target_type: 1, created_at: -1 });
schema.index({ banner_id: 1, created_at: -1 });
schema.index({ announcement_id: 1, created_at: -1 });
schema.index({ shop_info_id: 1, created_at: -1 });
schema.index({ actor_id: 1, created_at: -1 });
schema.index({ actor_type: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });
schema.index({ level: 1, created_at: -1 });
schema.index({ public_status: 1, created_at: -1 });
schema.index({ display_name: 1, created_at: -1 });

module.exports = mongoose.model('ShopContentAuditLog', schema);
