const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        minlength: [2, 'Category name must be at least 2 characters'],
        maxlength: [100, 'Category name must not exceed 100 characters'],
    },
    slug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description must not exceed 500 characters'],
    },
    parent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true,
    },
    path: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
    ],
    level: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE',
        index: true,
    },
    icon_url: {
        type: String,
        trim: true,
    },
    image_url: {
        type: String,
        trim: true,
    },
    display_order: {
        type: Number,
        default: 0,
        index: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deleted_at: {
        type: Date,
        default: null,
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

// ===== INDEXES - Production Optimized =====
categorySchema.index(
    { slug: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_deleted: false
        }
    }
);

categorySchema.index(
    { parent_id: 1, display_order: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false
        }
    }
);

categorySchema.index({ path: 1 });

categorySchema.index(
    { path: 1, status: 1 },
    {
        partialFilterExpression: {
            status: 'ACTIVE',
            is_deleted: false
        }
    }
);

categorySchema.index({ level: 1, status: 1 });

categorySchema.index({ is_deleted: 1, status: 1 });

// ===== MIDDLEWARE: Auto-Slug Generation =====

/**
 * ✅ FIX #7: Auto-generate slug từ name
 * Chạy trước validate để check duplicate
 */
categorySchema.pre('validate', function (next) {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            replacement: '-',
        });
    }
    next();
});

// ===== MIDDLEWARE: Enforce Level & Timestamp on Save =====

/**
 * ✅ Pre-save: Enforce level consistency
 * level = path.length (tính tự động, không cho client set)
 * Chỉ dùng cho direct save(), không dùng cho update operations
 */
categorySchema.pre('save', function (next) {
    this.level = this.path.length;
    this.updated_at = Date.now();
    next();
});

// ===== MIDDLEWARE: Auto-Filter Soft-Deleted =====

/**
 * ✅ Auto-filter soft-deleted categories
 * Middleware để tự động exclude is_deleted=true từ queries
 * 
 * ⚠️ DISCIPLINE: Luôn truyền { includeDeleted: true } nếu cần query deleted
 */
categorySchema.pre(/^find/, function (next) {
    if (this.getOptions().includeDeleted) {
        return next();
    }
    this.where({ is_deleted: { $ne: true } });
    next();
});

// ===== STATIC METHODS: Path Calculation =====

/**
 * ✅ FIX #2: Tính toán path mới khi thay đổi parent
 * Bulletproof circular reference detection
 */
categorySchema.statics.calculateNewPath = async function (categoryId, newParentId) {
    const categoryIdStr = categoryId.toString();

    if (newParentId && newParentId.toString() === categoryIdStr) {
        throw new Error('Cannot set category as its own parent');
    }

    if (newParentId) {
        const newParent = await this.findById(newParentId);
        if (!newParent) {
            throw new Error('Parent category not found');
        }

        if (newParent.path.some(id => id.toString() === categoryIdStr)) {
            throw new Error(
                'Cannot set a descendant as parent (circular reference detected)'
            );
        }

        return [...newParent.path, newParentId];
    }

    return [];
};

/**
 * ✅ FIX #1: Update descendants path + level khi move category
 * CRITICAL: Đảm bảo cây không bị sai lệch
 * 
 * Ví dụ:
 * A (root)
 *  └ B (move to X)
 *     └ C
 *
 * oldPath(B) = [A]
 * desc.path(C) = [A, B]
 * newPath(B) = [X, A] (sau khi move)
 *
 * Tính path(C):
 * - Loại bỏ old ancestors: desc.path.slice(oldPath.length + 1)
 *   = [A, B].slice(2) = []
 * - Thêm new ancestors: [...newPath, ...descendants_part]
 *   = [X, A] + [] = [X, A]
 * - Level(C) = newPath.length + descendants_part.length = 2 + 0 = 2 ✅
 */
categorySchema.statics.updateDescendantsPath = async function (
    categoryId,
    oldPath,
    newPath,
    session
) {
    const categoryIdStr = categoryId.toString();

    const descendants = await this.find(
        { path: categoryIdStr },
        null,
        { session }
    ).lean();

    if (descendants.length === 0) {
        return { modifiedCount: 0 };
    }

    const bulkOps = descendants.map(desc => {
        // ✅ FIX: slice(oldPath.length + 1) để loại bỏ chính node B đang move
        const descendantsPart = desc.path.slice(oldPath.length + 1);
        const newDescPath = [...newPath, ...descendantsPart];

        return {
            updateOne: {
                filter: { _id: desc._id },
                update: {
                    $set: {
                        path: newDescPath,
                        level: newDescPath.length,  // ✅ Consistent với path
                        updated_at: Date.now(),
                    }
                }
            }
        };
    });

    const result = await this.bulkWrite(bulkOps, { session });
    return result;
};

// ===== STATIC METHODS: Query Helpers =====

/**
 * ✅ FIX #6.1: Tìm descendants + filter + sort
 * includeDeleted: nếu false → auto-exclude soft-deleted (pre hook)
 */
categorySchema.statics.findDescendants = async function (categoryId, options = {}) {
    const { includeInactive = false, includeDeleted = false } = options;

    const query = { path: categoryId };
    if (!includeInactive) {
        query.status = 'ACTIVE';
    }
    if (!includeDeleted) {
        query.is_deleted = { $ne: true };
    }

    return this.find(query, null, { includeDeleted })
        .sort({ level: 1, display_order: 1 })
        .lean();
};

/**
 * ✅ FIX #6.2: Tìm ancestors với đúng thứ tự (breadcrumb root → parent)
 */
categorySchema.statics.findAncestors = async function (categoryId, includeDeleted = false) {
    const query = { _id: categoryId };
    if (!includeDeleted) {
        query.is_deleted = { $ne: true };
    }

    const category = await this.findOne(query, null, { includeDeleted }).lean();
    if (!category || category.path.length === 0) {
        return [];
    }

    const ancestors = await this.find({
        _id: { $in: category.path },
        ...(includeDeleted ? {} : { is_deleted: { $ne: true } }),
    }, null, { includeDeleted }).lean();

    const ancestorsMap = new Map(
        ancestors.map(a => [a._id.toString(), a])
    );

    return category.path
        .map(id => ancestorsMap.get(id.toString()))
        .filter(Boolean);
};

/**
 * Direct children của category
 */
categorySchema.statics.findChildren = async function (categoryId, options = {}) {
    const { includeInactive = false, includeDeleted = false } = options;

    const query = { parent_id: categoryId || null };
    if (!includeInactive) {
        query.status = 'ACTIVE';
    }
    if (!includeDeleted) {
        query.is_deleted = { $ne: true };
    }

    return this.find(query, null, { includeDeleted })
        .sort({ display_order: 1, name: 1 })
        .lean();
};

/**
 * Tất cả descendants
 */
categorySchema.statics.findAllDescendants = async function (categoryId, options = {}) {
    return this.findDescendants(categoryId, options);
};

/**
 * ✅ Hard delete (clear descendants references)
 * Dùng khi thực sự xoá data (không soft delete)
 */
categorySchema.statics.hardDeleteWithDescendants = async function (categoryId, session) {
    const result = await this.deleteMany(
        {
            $or: [
                { _id: categoryId },
                { path: categoryId }
            ]
        },
        { session }
    );

    return {
        deletedCount: result.deletedCount,
        message: `Deleted 1 category and ${result.deletedCount - 1} descendants`,
    };
};

/**
 * ✅ Soft delete (mark + timestamp)
 * An toàn hơn cho dữ liệu quan trọng
 */
categorySchema.statics.softDelete = async function (categoryId, session) {
    const category = await this.findByIdAndUpdate(
        categoryId,
        {
            is_deleted: true,
            deleted_at: Date.now(),
        },
        { new: true, session }
    );

    if (!category) {
        throw new Error('Category not found');
    }

    await this.updateMany(
        { path: categoryId },
        {
            is_deleted: true,
            deleted_at: Date.now(),
        },
        { session }
    );

    return category;
};

/**
 * ✅ Restore soft-deleted category + descendants
 */
categorySchema.statics.restore = async function (categoryId, session) {
    const category = await this.findByIdAndUpdate(
        categoryId,
        {
            is_deleted: false,
            deleted_at: null,
        },
        { new: true, session }
    );

    if (!category) {
        throw new Error('Category not found');
    }

    await this.updateMany(
        { path: categoryId },
        {
            is_deleted: false,
            deleted_at: null,
        },
        { session }
    );

    return category;
};

module.exports = mongoose.model('Category', categorySchema);