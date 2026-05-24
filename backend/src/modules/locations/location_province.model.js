const mongoose = require('mongoose');

const locationProvinceSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: /^\d{2}$/,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['TINH', 'THANH_PHO'],
            required: true,
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
        collection: 'location_provinces',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

locationProvinceSchema.index({ display_order: 1, name: 1 });

module.exports = mongoose.model('LocationProvince', locationProvinceSchema);
