const mongoose = require('mongoose');

const locationWardSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: /^\d{5}$/,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['PHUONG', 'XA', 'DAC_KHU'],
            required: true,
        },
        province_code: {
            type: String,
            required: true,
            trim: true,
            match: /^\d{2}$/,
            index: true,
        },
        province_name: {
            type: String,
            required: true,
            trim: true,
        },
        display_order: {
            type: Number,
            required: true,
        },
        is_active: {
            type: Boolean,
            default: true,
            index: true,
        },
        source: {
            type: String,
            required: true,
        },
        effective_from: {
            type: Date,
            required: true,
        },
    },
    {
        collection: 'location_wards',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

locationWardSchema.index({ province_code: 1, display_order: 1, name: 1 });

module.exports = mongoose.model('LocationWard', locationWardSchema);
