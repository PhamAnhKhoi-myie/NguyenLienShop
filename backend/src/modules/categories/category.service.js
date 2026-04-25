const mongoose = require('mongoose');
const Category = require('./category.model');
const AppError = require('../../utils/appError.util');
const CategoryMapper = require('./category.mapper');

class CategoryService {
    /**
     * CREATE: Tạo category mới
     */
    static async createCategory(data) {
        const { name, slug, parent_id, ...rest } = data;

        // Auto-generate slug nếu không có
        let finalSlug = slug;
        if (!finalSlug && name) {
            const slugify = require('slugify');
            finalSlug = slugify(name, { lower: true, strict: true });
        }

        // Kiểm tra slug tồn tại
        const existingSlug = await Category.findOne({ slug: finalSlug });
        if (existingSlug) {
            throw new AppError('Slug already exists', 409, 'SLUG_CONFLICT');
        }

        // Kiểm tra parent tồn tại
        let path = [];
        if (parent_id) {
            const parentCategory = await Category.findById(parent_id);
            if (!parentCategory) {
                throw new AppError('Parent category not found', 404, 'PARENT_NOT_FOUND');
            }

            if (parentCategory.level >= 4) {
                throw new AppError(
                    'Category nesting level exceeded (max 5 levels)',
                    400,
                    'MAX_LEVEL_EXCEEDED'
                );
            }

            path = [...parentCategory.path, parentCategory._id];
        }

        const category = new Category({
            name,
            slug: finalSlug,
            parent_id: parent_id || null,
            path,
            ...rest,
        });

        await category.save();
        return CategoryMapper.toResponseDTO(category);
    }

    /**
     * READ: Get category by ID
     */
    static async getCategoryById(categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }
        return CategoryMapper.toResponseDTO(category);
    }

    /**
     * Get category by slug
     */
    static async getCategoryBySlug(slug) {
        const category = await Category.findOne({ slug });
        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }
        return CategoryMapper.toResponseDTO(category);
    }

    /**
     * Get all categories
     */
    static async getAllCategories(filters = {}) {
        const query = {};

        if (filters.status && filters.status !== 'ALL') {
            query.status = filters.status;
        }

        if (filters.parent_id !== undefined) {
            query.parent_id = filters.parent_id || null;
        }

        const categories = await Category.find(query)
            .sort({ display_order: 1, name: 1 })
            .lean();

        return categories.map(CategoryMapper.toResponseDTO);
    }

    /**
     * Get category tree (nested structure)
     */
    static async getCategoryTree(filters = {}) {
        const statusFilter = filters.include_inactive ? {} : { status: 'ACTIVE' };

        const allCategories = await Category.find(statusFilter)
            .sort({ level: 1, display_order: 1 })
            .lean();

        const categoryMap = new Map();
        const roots = [];

        allCategories.forEach((cat) => {
            categoryMap.set(cat._id.toString(), {
                ...CategoryMapper.toResponseDTO(cat),
                children: [],
            });
        });

        allCategories.forEach((cat) => {
            const categoryNode = categoryMap.get(cat._id.toString());

            if (!cat.parent_id) {
                roots.push(categoryNode);
            } else {
                const parent = categoryMap.get(cat.parent_id.toString());
                if (parent) {
                    parent.children.push(categoryNode);
                }
            }
        });

        const sortChildren = (categories) => {
            categories.forEach((cat) => {
                cat.children.sort((a, b) => a.display_order - b.display_order);
                if (cat.children.length > 0) {
                    sortChildren(cat.children);
                }
            });
        };

        sortChildren(roots);
        roots.sort((a, b) => a.display_order - b.display_order);

        return roots;
    }

    /**
     * ✅ FIX #3: UPDATE category với transaction
     * - Xử lý parent change
     * - ✅ Update tất cả descendants khi parent thay đổi
     */
    static async updateCategory(categoryId, data) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const category = await Category.findById(categoryId).session(session);
            if (!category) {
                throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            // Kiểm tra slug
            if (data.slug && data.slug !== category.slug) {
                const existingSlug = await Category.findOne(
                    { slug: data.slug, _id: { $ne: categoryId } }
                ).session(session);
                if (existingSlug) {
                    throw new AppError('Slug already exists', 409, 'SLUG_CONFLICT');
                }
            }

            // ✅ FIX #3: XỬ LÝ PARENT CHANGE
            let pathChanged = false;
            const oldPath = [...category.path];

            if (data.parent_id !== undefined &&
                String(data.parent_id) !== String(category.parent_id)) {

                const newPath = await Category.calculateNewPath(categoryId, data.parent_id);

                category.path = newPath;
                category.parent_id = data.parent_id || null;
                pathChanged = true;
            }

            // Update fields
            if (data.name !== undefined) category.name = data.name;
            if (data.slug !== undefined) category.slug = data.slug;
            if (data.description !== undefined) category.description = data.description;
            if (data.status !== undefined) category.status = data.status;
            if (data.icon_url !== undefined) category.icon_url = data.icon_url;
            if (data.image_url !== undefined) category.image_url = data.image_url;
            if (data.display_order !== undefined) category.display_order = data.display_order;

            await category.save({ session });

            // ✅ FIX: Update tất cả descendants khi parent changed
            if (pathChanged) {
                const descendants = await Category.find(
                    { path: categoryId },
                    null,
                    { session }
                );

                for (const descendant of descendants) {
                    // ✅ Replace old path prefix với new path
                    descendant.path = [
                        ...category.path,
                        categoryId,
                        ...descendant.path.slice(oldPath.length + 1),
                    ];
                    await descendant.save({ session });
                }
            }

            await session.commitTransaction();
            const updated = await Category.findById(categoryId);
            return CategoryMapper.toResponseDTO(updated);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ FIX: DELETE strategy - Soft delete (safer)
     * Soft delete → is_deleted=true, deleted_at=timestamp
     * Descendants tự động soft delete
     */
    static async deleteCategory(categoryId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const category = await Category.findById(categoryId).session(session);
            if (!category) {
                throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            // TODO: Check product count
            // const productCount = await Product.countDocuments({ category_id: categoryId });
            // if (productCount > 0) {
            //     throw new AppError(
            //         'Cannot delete category with active products',
            //         409,
            //         'CATEGORY_HAS_PRODUCTS'
            //     );
            // }

            // ✅ FIX: Soft delete category + descendants
            await Category.softDelete(categoryId, session);

            await session.commitTransaction();
            return {
                message: 'Category deleted successfully (soft delete)',
                categoryId
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ FIX: Hard delete (ADMIN only)
     * Thực sự xoá data (dùng khi cần cleanup)
     */
    static async hardDeleteCategory(categoryId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const category = await Category.findById(categoryId).session(session);
            if (!category) {
                throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            // Hard delete category + descendants
            const result = await Category.hardDeleteWithDescendants(categoryId, session);

            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * ✅ FIX: Restore soft-deleted category + descendants
     */
    static async restoreCategory(categoryId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // ✅ Tìm soft-deleted categories
            const category = await Category.findOne(
                { _id: categoryId },
                null,
                { session }
            ).setOptions({ _recursed: true });

            if (!category) {
                throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            if (!category.is_deleted) {
                throw new AppError('Category is not deleted', 400, 'CATEGORY_NOT_DELETED');
            }

            // ✅ Restore category + descendants
            await Category.restore(categoryId, session);

            await session.commitTransaction();
            const restored = await Category.findById(categoryId);
            return CategoryMapper.toResponseDTO(restored);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get breadcrumb (ancestors)
     */
    static async getCategoryBreadcrumb(categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        const ancestors = await Category.findAncestors(categoryId);

        return {
            breadcrumb: [
                ...ancestors.map(CategoryMapper.toResponseDTO),
                CategoryMapper.toResponseDTO(category),
            ],
        };
    }

    /**
     * Get ancestors
     */
    static async getCategoryAncestors(categoryId) {
        const ancestors = await Category.findAncestors(categoryId);
        return ancestors.map(CategoryMapper.toResponseDTO);
    }

    /**
     * Get direct children
     */
    static async getCategoryChildren(categoryId) {
        const children = await Category.findChildren(categoryId);
        return children.map(CategoryMapper.toResponseDTO);
    }

    /**
     * Get all descendants
     */
    static async getCategoryDescendants(categoryId, includeInactive = false) {
        const descendants = await Category.findDescendants(categoryId, {
            includeInactive,
        });
        return descendants.map(CategoryMapper.toResponseDTO);
    }
}

module.exports = CategoryService;