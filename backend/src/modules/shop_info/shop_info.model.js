const mongoose = require('mongoose');

const workingHourSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            enum: {
                values: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                message: 'Day must be one of: mon, tue, wed, thu, fri, sat, sun'
            },
            required: [true, 'Day is required']
        },

        open: {
            type: String,
            required: [true, 'Opening time is required'],
            match: [/^\d{2}:\d{2}$/, 'Opening time must be in HH:MM format'],
            // Example: "08:00"
        },

        close: {
            type: String,
            required: [true, 'Closing time is required'],
            match: [/^\d{2}:\d{2}$/, 'Closing time must be in HH:MM format'],
            // Example: "18:00"
        },
    },
    { _id: false }
);

const socialLinksSchema = new mongoose.Schema(
    {
        facebook: {
            type: String,
            trim: true,
        },

        zalo: {
            type: String,
            trim: true,
        },

        instagram: {
            type: String,
            trim: true,
        },

        shoppe: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const shopInfoSchema = new mongoose.Schema(
    {
        shop_name: {
            type: String,
            required: [true, 'Shop name is required'],
            trim: true,
            minlength: [2, 'Shop name must be at least 2 characters'],
            maxlength: [100, 'Shop name must not exceed 100 characters'],
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email address'
            ],
        },

        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            match: [
                /^(\+84|0)[0-9]{9,10}$/,
                'Phone number must be valid Vietnamese format'
            ],
        },

        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true,
            maxlength: [500, 'Address must not exceed 500 characters'],
        },

        working_hours: {
            type: [workingHourSchema],
            validate: {
                validator: function (v) {
                    if (!v || v.length === 0) return false;
                    const days = v.map(h => h.day);
                    return days.length === new Set(days).size;
                },
                message: 'Each day can only appear once in working hours'
            },
            default: [],
        },

        social_links: {
            type: socialLinksSchema,
            default: () => ({}),
        },

        map_embed_url: {
            type: String,
            trim: true,
        },

        // ===== STATUS =====
        is_active: {
            type: Boolean,
            default: true,
        },

        // ===== TIMESTAMPS =====
        created_at: {
            type: Date,
            default: Date.now,
        },

        updated_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// ===== INDEXES =====
shopInfoSchema.index({ shop_name: 1 });

// ===== MIDDLEWARE =====
shopInfoSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

const ShopInfo = mongoose.model('ShopInfo', shopInfoSchema);

module.exports = ShopInfo;
