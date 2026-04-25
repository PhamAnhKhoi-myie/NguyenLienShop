const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        // Content
        image: {
            url: {
                type: String,
                required: true,
                validate: {
                    validator: (v) => /^https?:\/\//.test(v),
                    message: 'Image URL must be valid HTTP(S) URL'
                }
            },
            alt_text: {
                type: String,
                default: '',
                maxlength: 200
            },
            public_id: String // Cloudinary/S3 ID for deletion
        },

        // Link destination
        link: {
            type: String,
            required: true,
            validate: {
                validator: (v) => /^(https?:\/\/|\/|[a-zA-Z0-9\-_]+)/.test(v),
                message: 'Link must be URL, route (/) or ID'
            }
        },

        // Display configuration
        location: {
            type: String,
            enum: [
                'homepage_top',
                'homepage_middle',
                'homepage_bottom',
                'category_page'
            ],
            required: true,
            index: true
        },

        sort_order: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: 999
        },

        // Scheduling
        start_at: {
            type: Date,
            required: true
        },

        end_at: {
            type: Date,
            required: true,
            validate: {
                validator: function (v) {
                    return v > this.start_at;
                },
                message: 'end_at must be after start_at'
            }
        },

        // Soft delete
        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        },

        deleted_at: Date,

        // Audit trail
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// ✅ CRITICAL: Auto-exclude deleted documents
bannerSchema.pre(/^find/, function () {
    // Allow bypass with includeDeleted option
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
});

// ✅ Indexes for performance
bannerSchema.index(
    { location: 1, sort_order: 1, is_deleted: 1 },
    { name: 'idx_location_sort_active' }
);

bannerSchema.index(
    { start_at: 1, end_at: 1, is_deleted: 1 },
    { name: 'idx_scheduling_active' }
);

// ✅ Partial unique index for location + sort_order (allow reuse if deleted)
bannerSchema.index(
    { location: 1, sort_order: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { is_deleted: false },
        name: 'idx_location_sort_unique_active'
    }
);

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;