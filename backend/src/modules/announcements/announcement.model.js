const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
    {
        // Content (MANDATORY)
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 200,
            index: true
        },

        content: {
            type: String,
            required: true,
            minlength: 10,
            maxlength: 5000
        },

        // Visibility & Priority
        priority: {
            type: Number,
            default: 0,
            min: 0,
            max: 10,
            index: true
        },

        // Targeting (for role-based announcements)
        target: {
            type: String,
            enum: ['all', 'user', 'admin', 'guest'],
            default: 'all',
            index: true
        },

        // Type for UI styling
        type: {
            type: String,
            enum: ['info', 'warning', 'promotion', 'system', 'urgent'],
            default: 'info'
        },

        // Can user dismiss this announcement?
        is_dismissible: {
            type: Boolean,
            default: true
        },

        // Scheduling (CRITICAL - source of truth for is_active)
        start_at: {
            type: Date,
            required: true,
            index: true
        },

        end_at: {
            type: Date,
            required: true,
            index: true,
            validate: {
                validator: function (v) {
                    return v > this.start_at;
                },
                message: 'end_at must be after start_at'
            }
        },

        // Audit Trail (MANDATORY)
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // Soft Delete (MANDATORY)
        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        },

        deleted_at: {
            type: Date,
            sparse: true
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// ✅ CRITICAL: Auto-exclude soft-deleted announcements from public queries
announcementSchema.pre(/^find/, function () {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
});

// ✅ Performance indexes
announcementSchema.index(
    { is_deleted: 1, start_at: 1, end_at: 1 },
    { name: 'idx_active_scheduling' }
);

announcementSchema.index(
    { target: 1, priority: -1, start_at: -1 },
    { name: 'idx_target_priority' }
);

announcementSchema.index(
    { created_at: -1 },
    { name: 'idx_created_recent' }
);

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;