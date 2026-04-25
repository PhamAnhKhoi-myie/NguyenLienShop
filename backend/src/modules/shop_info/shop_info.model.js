const mongoose = require('mongoose');

/**
 * ============================================
 * SHOP INFO SCHEMA
 * ============================================
 * 
 * Represents: Shop contact & business information
 * 
 * Key Points:
 * - Single document (shop_name acts as identifier)
 * - All fields required for completeness
 * - Working hours as array (flexible schedule)
 * - Social links as nested object (flexible URLs)
 * - is_active for soft activation (not full soft-delete)
 * - Timestamps for audit trail
 * 
 * Critical:
 * ✅ Email & phone normalized (lowercase, trimmed)
 * ✅ Working hours validated (valid days)
 * ✅ Map URL optional (may not have Google Maps)
 * ✅ Single document constraint (only 1 shop info should exist)
 */

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
            // URL to Facebook page
        },

        zalo: {
            type: String,
            trim: true,
            // Zalo contact (phone or URL)
        },

        instagram: {
            type: String,
            trim: true,
            // URL to Instagram profile
        },

        shoppe: {
            type: String,
            trim: true,
            // URL to Shopee store
        },
    },
    { _id: false }
);

const shopInfoSchema = new mongoose.Schema(
    {
        // ===== SHOP IDENTITY =====
        shop_name: {
            type: String,
            required: [true, 'Shop name is required'],
            trim: true,
            minlength: [2, 'Shop name must be at least 2 characters'],
            maxlength: [100, 'Shop name must not exceed 100 characters'],
        },

        // ===== CONTACT INFORMATION =====
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
            // Example: "0912345678" or "+84912345678"
        },

        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true,
            maxlength: [500, 'Address must not exceed 500 characters'],
        },

        // ===== OPERATING HOURS =====
        working_hours: {
            type: [workingHourSchema],
            validate: {
                validator: function (v) {
                    if (!v || v.length === 0) return false;
                    // Ensure no duplicate days
                    const days = v.map(h => h.day);
                    return days.length === new Set(days).size;
                },
                message: 'Each day can only appear once in working hours'
            },
            default: [],
        },

        // ===== SOCIAL MEDIA & LINKS =====
        social_links: {
            type: socialLinksSchema,
            default: () => ({}),
        },

        map_embed_url: {
            type: String,
            trim: true,
            // Google Maps embed URL (optional)
            // Example: "https://www.google.com/maps/embed?pb=..."
        },

        // ===== STATUS =====
        is_active: {
            type: Boolean,
            default: true,
            // Set to false if shop is temporarily closed
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
// Single document lookup
shopInfoSchema.index({ shop_name: 1 });

// ===== MIDDLEWARE =====
// Auto-update updated_at on save
shopInfoSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

const ShopInfo = mongoose.model('ShopInfo', shopInfoSchema);

module.exports = ShopInfo;
