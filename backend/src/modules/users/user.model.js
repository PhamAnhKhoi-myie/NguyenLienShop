const mongoose = require('mongoose');
const { normalizePhoneNumber } = require('../../utils/phone.util');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            default: null,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },

        password_hash: {
            type: String,
            required: true,
            select: false,
        },

        profile: {
            full_name: {
                type: String,
                trim: true,
            },
            avatar_url: {
                type: String,
                trim: true,
            },
            phone_number: {
                type: String,
                required: true,
                trim: true,
                set: normalizePhoneNumber,
                match: /^0[35789]\d{8}$/,
            },
            gender: {
                type: String,
                enum: ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'],
                default: 'UNSPECIFIED',
            },
        },

        roles: {
            type: [String],
            enum: ['CUSTOMER', 'VIP', 'MANAGER', 'ADMIN'],
            default: ['CUSTOMER'],
            validate: {
                validator: function (v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: 'User must have at least one role',
            },
        },

        tier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: 'bronze',
        },

        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
            default: 'ACTIVE',
        },

        is_email_verified: {
            type: Boolean,
            default: false,
        },

        email_verified_at: {
            type: Date,
            default: null,
        },

        is_phone_verified: {
            type: Boolean,
            default: false,
        },

        phone_verified_at: {
            type: Date,
            default: null,
        },

        token_version: {
            type: Number,
            default: 0,
            select: false,
        },

        last_login_at: {
            type: Date,
        },

        deleted_at: {
            type: Date,
            default: null,
            select: false,
        },

        deleted_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            select: false,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);


userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            deleted_at: { $eq: null },
            email: { $type: 'string' },
        },
    }
);
userSchema.index(
    { email: 1, deleted_at: 1, status: 1 },
    { partialFilterExpression: { deleted_at: null } }
);
userSchema.index({ deleted_at: 1 });
userSchema.index({ status: 1, deleted_at: 1 });
userSchema.index({ is_email_verified: 1, deleted_at: 1 });
userSchema.index({ is_phone_verified: 1, deleted_at: 1 });
userSchema.index(
    { 'profile.phone_number': 1 },
    {
        unique: true,
        partialFilterExpression: {
            deleted_at: { $eq: null },
            'profile.phone_number': { $type: 'string' },
        },
    }
);
userSchema.index({ _id: 1, token_version: 1 });


const excludeDeleted = function (next) {
    const options = this.getOptions?.() || {};

    if (!options.includeDeleted) {
        this.where({ deleted_at: null });
    }

    next();
};

userSchema.pre('find', excludeDeleted);
userSchema.pre('findOne', excludeDeleted);
userSchema.pre('countDocuments', excludeDeleted);
userSchema.pre('findOneAndUpdate', excludeDeleted);
userSchema.pre('aggregate', function (next) {
    const pipeline = this.pipeline();

    const hasDeletedFilter = pipeline.some(
        (stage) =>
            stage.$match &&
            Object.prototype.hasOwnProperty.call(stage.$match, 'deleted_at')
    );

    if (!hasDeletedFilter) {
        pipeline.unshift({ $match: { deleted_at: null } });
    }

    next();
});
userSchema.pre('save', function (next) {
    if (this.email) {
        this.email = this.email.toLowerCase().trim();
    }
    if (this.profile?.phone_number) {
        this.profile.phone_number = normalizePhoneNumber(this.profile.phone_number);
    }
    next();
});


const sanitizeTransform = (_, ret) => {
    delete ret.password_hash;
    delete ret.token_version;
    delete ret.deleted_at;
    delete ret.__v;
    return ret;
};

userSchema.set('toJSON', { transform: sanitizeTransform });
userSchema.set('toObject', { transform: sanitizeTransform });

module.exports = mongoose.model('User', userSchema);
