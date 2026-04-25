const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
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
                trim: true,
                match: /^[0-9]{9,15}$/,
                default: null,
            },
        },

        roles: {
            type: [String],
            enum: ['CUSTOMER', 'MANAGER', 'ADMIN'],
            default: ['CUSTOMER'],
            validate: {
                validator: function (v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: 'User must have at least one role',
            },
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
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    }
);

// ===== INDEXES =====
userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            deleted_at: { $eq: null },
        },
    }
);

userSchema.index(
    { email: 1, deleted_at: 1, status: 1 },
    { partialFilterExpression: { deleted_at: null } }
);

userSchema.index({ status: 1, deleted_at: 1 });
userSchema.index({ is_email_verified: 1, deleted_at: 1 });

userSchema.index(
    { 'profile.phone_number': 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            deleted_at: { $eq: null },
            'profile.phone_number': { $exists: true, $ne: null },
        },
    }
);

userSchema.index({ _id: 1, token_version: 1 });

// ===== MIDDLEWARE =====
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
        this.profile.phone_number = this.profile.phone_number.trim();
        //Guard against empty string
        if (this.profile.phone_number === '') {
            this.profile.phone_number = null;
        }
    }
    next();
});

// ===== RESPONSE SANITIZATION =====
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