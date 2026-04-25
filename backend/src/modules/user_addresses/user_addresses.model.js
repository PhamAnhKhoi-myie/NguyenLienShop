// filepath: c:\MyEffort\NguyenLien\backend\src\modules\user_addresses\user_addresses.model.js
const mongoose = require('mongoose');

const userAddressSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_name: { type: String, required: true },
    phone: { type: String, required: true },
    address_line_1: { type: String, required: true },
    address_line_2: { type: String },
    city: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    is_default: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Indexes
userAddressSchema.index({ user_id: 1 });
userAddressSchema.index(
    { user_id: 1, is_default: 1 },
    { unique: true, partialFilterExpression: { is_default: true } }
);

// Update timestamp on save
userAddressSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('UserAddress', userAddressSchema);