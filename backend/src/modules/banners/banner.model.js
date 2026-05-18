const mongoose = require('mongoose');
const { isSafeBannerLink } = require('./banner-link.util');

const bannerSchema = new mongoose.Schema(
    {
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
            public_id: String
        },

        link: {
            type: String,
            required: true,
            validate: {
                validator: isSafeBannerLink,
                message: 'Link must be URL, route (/) or ID'
            }
        },

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

        is_deleted: {
            type: Boolean,
            default: false,
            index: true
        },

        deleted_at: Date,

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

bannerSchema.pre(/^find/, function () {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ is_deleted: false });
    }
});

bannerSchema.index(
    { location: 1, sort_order: 1, is_deleted: 1 },
    { name: 'idx_location_sort_active' }
);

bannerSchema.index(
    { start_at: 1, end_at: 1, is_deleted: 1 },
    { name: 'idx_scheduling_active' }
);

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
