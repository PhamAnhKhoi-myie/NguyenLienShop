const mongoose = require('mongoose');
const Product = require('./product.model');
const Variant = require('./variant.model');
const VariantUnit = require('./variant_unit.model');
const ProductMapper = require('./product.mapper');
const AppError = require('../../utils/appError.util');

class ProductService {
    /**
     * CREATE: Tạo product mới
     * 
     * @param {Object} data - { name, slug, category_id, brand, description, ... }
     * @returns {Object} Product DTO
     */
    static async createProduct(data) {
        const { name, category_id, ...rest } = data;

        // ✅ Check category exists
        if (category_id) {
            const Category = require('../categories/category.model');
            const category = await Category.findById(category_id);
            if (!category) {
                throw new AppError(
                    'Category not found',
                    404,
                    'CATEGORY_NOT_FOUND'
                );
            }
        }

        // ✅ Create product
        const product = new Product({
            name,
            category_id,
            ...rest,
        });

        await product.save();
        return ProductMapper.toResponseDTO(product);
    }

    /**
     * READ: Get product by ID (with variants + units)
     * 
     * @param {String} productId - MongoDB ObjectId
     * @returns {Object} Product DTO with nested variants
     */
    static async getProductById(productId) {
        const product = await Product.findById(productId).lean();
        if (!product) {
            throw new AppError(
                'Product not found',
                404,
                'PRODUCT_NOT_FOUND'
            );
        }

        const variants = await Variant.find(
            { product_id: productId },
            null,
            { includeDeleted: false }
        ).lean();

        const variantsWithUnits = await Promise.all(
            variants.map(async (variant) => {
                const units = await VariantUnit.find(
                    { variant_id: variant._id }
                ).lean();
                return {
                    ...variant,
                    units,
                };
            })
        );

        return ProductMapper.toDetailDTO(product, variantsWithUnits);
    }

    /**
     * Get product by slug
     * 
     * @param {String} slug - Product slug
     * @returns {Object} Product DTO with variants
     */
    static async getProductBySlug(slug) {
        const product = await Product.findBySlug(slug).lean();
        if (!product) {
            throw new AppError(
                'Product not found',
                404,
                'PRODUCT_NOT_FOUND'
            );
        }

        const variants = await Variant.find(
            { product_id: product._id }
        ).lean();

        const variantsWithUnits = await Promise.all(
            variants.map(async (variant) => {
                const units = await VariantUnit.find(
                    { variant_id: variant._id }
                ).lean();
                return { ...variant, units };
            })
        );

        return ProductMapper.toDetailDTO(product, variantsWithUnits);
    }

    /**
     * READ: Get all products with pagination + filtering
     * 
     * @param {Number} page
     * @param {Number} limit
     * @param {Object} filters - { category_id, min_price, max_price, search, status, sortBy }
     * @returns {Object} Paginated products
     */
    static async getAllProducts(
        page = 1,
        limit = 20,
        filters = {}
    ) {
        const skip = (page - 1) * limit;
        const query = {};

        // Filter by category
        if (filters.category_id) {
            query.category_id = filters.category_id;
        }

        // Filter by status
        if (filters.status) {
            query.status = filters.status;
        }

        // Filter by price range
        if (filters.min_price || filters.max_price) {
            query.min_price = {};
            if (filters.min_price) {
                query.min_price.$gte = filters.min_price;
            }
            if (filters.max_price) {
                query.min_price.$lte = filters.max_price;
            }
        }

        // Text search
        let sortBy = { created_at: -1 };
        if (filters.search) {
            query.$text = { $search: filters.search };
            sortBy = { score: { $meta: 'textScore' }, ...sortBy };
        } else if (filters.sortBy === 'popular') {
            sortBy = { sold_count: -1, rating_avg: -1 };
        } else if (filters.sortBy === 'rating') {
            sortBy = { rating_avg: -1 };
        } else if (filters.sortBy === 'price_asc') {
            sortBy = { min_price: 1 };
        } else if (filters.sortBy === 'price_desc') {
            sortBy = { max_price: -1 };
        }

        // Execute query
        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .skip(skip)
            .limit(limit)
            .sort(sortBy)
            .lean();

        return {
            data: products.map(ProductMapper.toListDTO),
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

    /**
     * UPDATE: Update product info (NOT pricing - that's handled by variant service)
     * 
     * @param {String} productId
     * @param {Object} updateData - { name, description, images, ... }
     * @returns {Object} Updated product DTO
     */
    static async updateProduct(productId, updateData) {
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }

        try {
            const product = await Product.findByIdAndUpdate(
                productId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!product) {
                throw new AppError(
                    'Product not found',
                    404,
                    'PRODUCT_NOT_FOUND'
                );
            }

            return ProductMapper.toResponseDTO(product);
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError(
                    'Slug already exists',
                    409,
                    'SLUG_CONFLICT'
                );
            }
            throw error;
        }
    }

    /**
     * DELETE: Soft-delete product (+ all variants)
     * 
     * @param {String} productId
     * @returns {Object} Deletion confirmation
     */
    static async deleteProduct(productId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const product = await Product.findById(productId).session(
                session
            );
            if (!product) {
                throw new AppError(
                    'Product not found',
                    404,
                    'PRODUCT_NOT_FOUND'
                );
            }

            // ✅ Soft-delete product + variants (cascade)
            await Product.softDelete(productId, session);

            await session.commitTransaction();
            return {
                message: 'Product deleted successfully (soft delete)',
                productId,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * INTERNAL: Update product price cache (called từ variant service)
     * 
     * ✅ FIX #3: When variant prices change, recalculate product min/max
     * 
     * Logic:
     * - min_price = MIN dari tất cả active variants
     * - max_price = MAX dari tất cả active variants
     * - min_price_per_unit = MIN unit price
     * - max_price_per_unit = MAX unit price
     */
    static async recalcuatePriceCache(productId) {
        try {
            await Product.updatePriceCache(productId);
        } catch (error) {
            console.error(`Failed to update price cache for product ${productId}:`, error);
            // Don't throw - cache update is non-critical
        }
    }

    /**
     * ANALYTICS: Update product stats (called từ order service)
     * 
     * @param {String} productId
     * @param {Object} stats - { sold_count, rating_avg, rating_count }
     */
    static async updateProductStats(productId, stats) {
        await Product.findByIdAndUpdate(productId, { $set: stats });
    }

    /**
     * LIST by category with tree structure
     * 
     * @param {String} categoryId
     * @param {Number} limit
     * @returns {Array} Products in category
     */
    static async getProductsByCategory(categoryId, limit = 50) {
        const products = await Product.find({
            category_id: categoryId,
            status: 'ACTIVE',
        })
            .limit(limit)
            .sort({ sold_count: -1 })
            .lean();

        return products.map(ProductMapper.toListDTO);
    }

    /**
     * Search products
     * 
     * @param {String} query
     * @param {Number} limit
     * @returns {Array} Matching products
     */
    static async searchProducts(query, limit = 20) {
        const products = await Product.find(
            { $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();

        return products.map(ProductMapper.toListDTO);
    }
}

module.exports = ProductService;