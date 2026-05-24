const mongoose = require('mongoose');

const userAddressSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    province_code: { type: String, required: true, trim: true, match: /^\d{2}$/ },
    province_name: { type: String, required: true, trim: true },
    ward_code: { type: String, required: true, trim: true, match: /^\d{5}$/ },
    ward_name: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true },
    full_address: { type: String, required: true, trim: true },
    note: { type: String, default: null, trim: true },
    is_default: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null, select: false },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, select: false }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

userAddressSchema.index({ user_id: 1 });
userAddressSchema.index({ province_code: 1, ward_code: 1 });
userAddressSchema.index(
    { user_id: 1, is_default: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_default: true,
            deleted_at: null
        }
    }
);

userAddressSchema.pre(
    ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'updateMany', 'updateOne'],
    function (next) {
        this.where({ deleted_at: null });
        next();
    }
);

module.exports = mongoose.model('UserAddress', userAddressSchema);
