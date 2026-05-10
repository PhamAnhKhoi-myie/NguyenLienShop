const mongoose = require('mongoose');
const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../../constants/audit');

const auditLogSchema = new mongoose.Schema(
    {
        actor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            description: 'ID của Admin/Manager thực hiện hành động'
        },
        action: {
            type: String,
            enum: Object.values(AUDIT_ACTIONS),
            required: true,
        },
        entity_type: {
            type: String,
            enum: Object.values(ENTITY_TYPES),
            required: true,
        },
        entity_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            description: 'ID của bản ghi bị tác động'
        },
        changes: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            description: 'Các field thay đổi dạng diff { field: { from, to } }',
        },
        ip_address: {
            type: String,
            default: null,
        },
        user_agent: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: false // Log thì không cần updatedAt
        },
    }
);

auditLogSchema.set('toJSON', {
    transform: (_, ret) => {
        delete ret.__v;
        return ret;
    }
});

// Đánh index để tối ưu hóa truy vấn cho Admin khi lọc log
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);