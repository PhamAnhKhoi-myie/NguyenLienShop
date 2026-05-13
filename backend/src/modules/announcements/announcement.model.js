const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
    {
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

        priority: {
            type: Number,
            default: 0,
            min: 0,
            max: 10,
            index: true
        },

        target: {
            type: String,
            enum: ['all', 'user', 'admin', 'guest'],
            default: 'all',
            index: true
        },

        type: {
            type: String,
            enum: ['info', 'warning', 'promotion', 'system', 'urgent'],
            default: 'info'
        },

        is_dismissible: {
            type: Boolean,
            default: true
        },

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

        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

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

announcementSchema.pre(/^find/, function () {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
});

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