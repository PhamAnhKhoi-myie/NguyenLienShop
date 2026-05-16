const mongoose = require('mongoose');
const Product = require('./product.model');
const Variant = require('./variant.model');
const VariantUnit = require('./variant_unit.model');
const ProductMapper = require('./product.mapper');
const AppError = require('../../utils/appError.util');

class ProductService {
    static async createProduct(data) {
        const { name, category_id, ...rest } = data;

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

        try {
            const product = new Product({
                name,
                category_id,
                ...rest,
            });

            await product.save();

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

    static async getProductById(productId, options = {}) {
        const { includeUnits = true } = options;

        const product = await Product.findOne({
            _id: productId,
            is_deleted: false
        }).lean();

        if (!product) {
            throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }

        return this._buildProductDetail(product, includeUnits);
    }

    static async getProductBySlug(slug, options = {}) {
        const { includeUnits = true } = options;

        const product = await Product.findOne({
            slug,
            is_deleted: false
        }).lean();

        if (!product) {
            throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }

        return this._buildProductDetail(product, includeUnits);
    }

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
            const priceConditions = [];

            if (filters.min_price !== undefined) {
                priceConditions.push({
                    max_price: { $gte: filters.min_price }
                });
            }

            if (filters.max_price !== undefined) {
                priceConditions.push({
                    min_price: { $lte: filters.max_price }
                });
            }

            if (priceConditions.length > 0) {
                query.$and = priceConditions;
            }
        }

        const search = filters.search?.trim();
        let sortBy = { created_at: -1 };
        if (search) {
            if (!query.status) {
                query.status = 'ACTIVE';
            }

            if (query.status === 'ACTIVE') {
                query.$text = { $search: search };
                sortBy = { score: { $meta: 'textScore' }, ...sortBy };
            } else {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { short_description: { $regex: search, $options: 'i' } },
                    { search_keywords: { $regex: search, $options: 'i' } },
                ];
            }
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
            data: products.map((p) => ProductMapper.toListDTO(p)),
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

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

    static async recalcuatePriceCache(productId) {
        try {
            await Product.updatePriceCache(productId);
        } catch (error) {
            console.error(`Failed to update price cache for product ${productId}:`, error);
            // Don't throw - cache update is non-critical
        }
    }

    static async updateProductStats(productId, stats) {
        await Product.findByIdAndUpdate(productId, { $set: stats });
    }

    static async getProductsByCategory(categoryId, limit = 50) {
        const products = await Product.find({
            category_id: categoryId,
            status: 'ACTIVE',
        })
            .limit(limit)
            .sort({ sold_count: -1 })
            .lean();

        return products.map((p) => ProductMapper.toListDTO(p));
    }

    static async searchProducts(query, limit = 20) {
        const products = await Product.find(
            { status: 'ACTIVE', $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();

        return products.map((p) => ProductMapper.toListDTO(p));
    }

    static async _buildProductDetail(product, includeUnits = true) {
        const variants = await Variant.find(
            { product_id: product._id },
            null,
            { includeDeleted: false }
        ).lean();

        let unitsMap = {};

        if (includeUnits && variants.length > 0) {
            const variantIds = variants.map(v => v._id);

            const allUnits = await VariantUnit.find({
                variant_id: { $in: variantIds }
            }).lean();

            for (const unit of allUnits) {
                const key = unit.variant_id.toString();
                if (!unitsMap[key]) {
                    unitsMap[key] = [];
                }
                unitsMap[key].push(unit);
            }
        }

        const variantsWithUnits = variants.map((variant) => ({
            ...variant,
            units: includeUnits
                ? (unitsMap[variant._id.toString()] || [])
                : [],
        }));

        return ProductMapper.toDetailDTO(product, variantsWithUnits);
    }
}

module.exports = ProductService;
