const mongoose = require('mongoose');
const Product = require('./product.model');
const Variant = require('./variant.model');
const VariantUnit = require('./variant_unit.model');
const ProductMapper = require('./product.mapper');
const AppError = require('../../utils/appError.util');
const ProductAuditLogService = require('../audit_logs/product_audit_log/product_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const { summarizePriceTiers } = require('./pricing.util');

const SIMPLE_PRODUCT_TYPE = 'SIMPLE';
const INTERNAL_SIMPLE_SIZE = 'Mặc định';
const INTERNAL_SIMPLE_FABRIC_TYPE = 'Tiêu chuẩn';
const SIMPLE_PRODUCT_FIELD_KEYS = [
    'simple_unit_type',
    'simple_unit_display_name',
    'simple_pack_size',
    'simple_price',
    'simple_stock',
    'simple_min_order_qty',
    'simple_max_order_qty',
    'simple_qty_step',
];

class ProductService {
    static async createProduct(data, actorId = null, metadata = {}) {
        const {
            productData,
            simpleConfig,
        } = this._splitProductPayload(data);
        const { name, category_id, ...rest } = productData;

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

        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const product = new Product({
                name,
                category_id,
                ...rest,
            });

            await product.save({ session });

            if (product.product_type === SIMPLE_PRODUCT_TYPE) {
                await this._upsertSimpleSalesSetup(product, simpleConfig, {
                    session,
                });
            }

            await session.commitTransaction();

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.CREATE_PRODUCT,
                targetType: 'PRODUCT',
                product,
                actorId,
                metadata,
                changes: {
                    name: {
                        from: null,
                        to: product.name,
                    },
                    category_id: {
                        from: null,
                        to: product.category_id,
                    },
                    status: {
                        from: null,
                        to: product.status,
                    },
                    slug: {
                        from: null,
                        to: product.slug,
                    },
                    product_type: {
                        from: null,
                        to: product.product_type,
                    },
                },
            });

            return this.getProductById(product._id, { includeUnits: true });

        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            if (error.code === 11000) {
                throw new AppError(
                    'Slug already exists',
                    409,
                    'SLUG_CONFLICT'
                );
            }

            throw error;
        } finally {
            session.endSession();
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
        const {
            page: normalizedPage,
            limit: normalizedLimit,
        } = this._normalizePagination(page, limit);
        const query = {};


        if (filters.category_id) {
            query.category_id = filters.category_id;
        }


        if (filters.status) {
            query.status = filters.status;
        }


        if (filters.badge === 'new') {
            query.new_until = { $gte: new Date() };
        } else if (filters.badge === 'best_seller') {
            query.is_best_seller = true;
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


        const products = await Product.find(query).sort(sortBy).lean();
        let decoratedProducts = await this._decorateProducts(products);

        if (filters.min_price !== undefined) {
            decoratedProducts = decoratedProducts.filter(
                (product) => product.max_price >= filters.min_price
            );
        }

        if (filters.max_price !== undefined) {
            decoratedProducts = decoratedProducts.filter(
                (product) => product.min_price <= filters.max_price
            );
        }

        if (filters.badge === 'on_sale') {
            decoratedProducts = decoratedProducts.filter(
                (product) => product.is_on_sale
            );
        } else if (filters.badge === 'in_stock') {
            decoratedProducts = decoratedProducts.filter(
                (product) => product.in_stock
            );
        }

        decoratedProducts = this._sortDecoratedProducts(
            decoratedProducts,
            filters.sortBy,
            Boolean(search)
        );

        const total = decoratedProducts.length;
        const skip = (normalizedPage - 1) * normalizedLimit;
        const paginatedProducts = decoratedProducts.slice(
            skip,
            skip + normalizedLimit
        );

        return {
            data: paginatedProducts.map((product) =>
                ProductMapper.toListDTO(product)
            ),
            pagination: {
                current_page: normalizedPage,
                total_pages: Math.ceil(total / normalizedLimit),
                total_items: total,
                per_page: normalizedLimit,
            },
        };
    }

    static _normalizePagination(page, limit) {
        const parsedPage = Number.parseInt(page, 10);
        const parsedLimit = Number.parseInt(limit, 10);

        return {
            page:
                Number.isInteger(parsedPage) && parsedPage > 0
                    ? parsedPage
                    : 1,
            limit:
                Number.isInteger(parsedLimit) && parsedLimit > 0
                    ? Math.min(parsedLimit, 100)
                    : 20,
        };
    }

    static async updateProduct(productId, updateData, actorId = null, metadata = {}) {
        const {
            productData,
            simpleConfig,
            hasSimpleConfig,
        } = this._splitProductPayload(updateData || {});

        if (
            (!productData || Object.keys(productData).length === 0) &&
            !hasSimpleConfig
        ) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }

        const session = await mongoose.startSession();
        let productForAudit = null;
        let changesForAudit = {};

        try {
            session.startTransaction();

            const currentProduct = await Product.findById(productId).session(
                session
            );

            if (!currentProduct) {
                throw new AppError(
                    'Product not found',
                    404,
                    'PRODUCT_NOT_FOUND'
                );
            }

            let product = currentProduct;

            if (Object.keys(productData).length > 0) {
                product = await Product.findByIdAndUpdate(
                    productId,
                    { $set: productData },
                    { new: true, runValidators: true, session }
                );
            }

            if (!product) {
                throw new AppError(
                    'Product not found',
                    404,
                    'PRODUCT_NOT_FOUND'
                );
            }

            if (
                product.product_type === SIMPLE_PRODUCT_TYPE &&
                (hasSimpleConfig || productData.product_type === SIMPLE_PRODUCT_TYPE)
            ) {
                await this._upsertSimpleSalesSetup(product, simpleConfig, {
                    session,
                });
                product = await Product.findById(productId).session(session);
            }

            productForAudit = product;
            changesForAudit = this._buildFieldChanges(
                currentProduct,
                product,
                Object.keys(productData)
            );

            await session.commitTransaction();

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.UPDATE_PRODUCT,
                targetType: 'PRODUCT',
                product: productForAudit,
                actorId,
                metadata,
                changes: changesForAudit,
            });

            return this.getProductById(productId, { includeUnits: true });
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            if (error.code === 11000) {
                throw new AppError(
                    'Slug already exists',
                    409,
                    'SLUG_CONFLICT'
                );
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async deleteProduct(productId, actorId = null, metadata = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        let product = null;
        let variantCount = 0;

        try {
            product = await Product.findById(productId).session(
                session
            );
            if (!product) {
                throw new AppError(
                    'Product not found',
                    404,
                    'PRODUCT_NOT_FOUND'
                );
            }


            variantCount = await Variant.countDocuments({
                product_id: productId,
            }).session(session);

            await Product.softDelete(productId, session);

            await session.commitTransaction();

            await this._createProductAuditLog({
                action: AUDIT_ACTIONS.DELETE_PRODUCT_SOFT,
                targetType: 'PRODUCT',
                product,
                actorId,
                metadata,
                changes: {
                    is_deleted: {
                        from: false,
                        to: true,
                    },
                    cascade_variants: {
                        from: 0,
                        to: variantCount,
                    },
                },
            });

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

        const decoratedProducts = await this._decorateProducts(products);
        return decoratedProducts.map((product) =>
            ProductMapper.toListDTO(product)
        );
    }

    static async searchProducts(query, limit = 20) {
        const products = await Product.find(
            { status: 'ACTIVE', $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();

        const decoratedProducts = await this._decorateProducts(products);
        return decoratedProducts.map((product) =>
            ProductMapper.toListDTO(product)
        );
    }

    static async _buildProductDetail(product, includeUnits = true) {
        const variants = await Variant.find(
            { product_id: product._id },
            null,
            { includeDeleted: false }
        ).lean();

        let unitsMap = {};

        if (variants.length > 0) {
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
            units: unitsMap[variant._id.toString()] || [],
        }));

        const decoratedVariants = variantsWithUnits.map((variant) =>
            this._decorateVariant(variant)
        );
        const decoratedProduct = this._decorateProduct(
            product,
            decoratedVariants
        );

        if (decoratedProduct.product_type === SIMPLE_PRODUCT_TYPE) {
            decoratedProduct.simple_sales = this._buildSimpleSalesSummary(
                decoratedVariants[0]
            );
        }

        const responseVariants = includeUnits
            ? decoratedVariants
            : decoratedVariants.map((variant) => ({
                ...variant,
                units: [],
            }));

        return ProductMapper.toDetailDTO(
            decoratedProduct,
            responseVariants
        );
    }

    static async _decorateProducts(products) {
        if (!Array.isArray(products) || products.length === 0) {
            return [];
        }

        const productIds = products.map((product) => product._id);
        const variants = await Variant.find(
            { product_id: { $in: productIds } },
            null,
            { includeDeleted: false }
        ).lean();
        const variantIds = variants.map((variant) => variant._id);
        const units = variantIds.length > 0
            ? await VariantUnit.find({
                variant_id: { $in: variantIds },
            }).lean()
            : [];

        const unitsByVariant = new Map();
        for (const unit of units) {
            const key = unit.variant_id.toString();
            const current = unitsByVariant.get(key) || [];
            current.push(unit);
            unitsByVariant.set(key, current);
        }

        const variantsByProduct = new Map();
        for (const variant of variants) {
            const decoratedVariant = this._decorateVariant({
                ...variant,
                units:
                    unitsByVariant.get(variant._id.toString()) || [],
            });
            const key = variant.product_id.toString();
            const current = variantsByProduct.get(key) || [];
            current.push(decoratedVariant);
            variantsByProduct.set(key, current);
        }

        return products.map((product) =>
            this._decorateProduct(
                product,
                variantsByProduct.get(product._id.toString()) || []
            )
        );
    }

    static _decorateVariant(variant) {
        const units = (variant.units || []).map((unit) => ({
            ...unit,
            ...summarizePriceTiers(
                unit.price_tiers,
                unit.pack_size,
                unit.promotion
            ),
        }));
        const availableUnits = units.filter(
            (unit) =>
                variant.status === 'ACTIVE' &&
                variant.stock?.available >=
                unit.pack_size * (unit.min_order_qty || 1)
        );

        return {
            ...variant,
            ...this._aggregatePriceSummaries(units, variant),
            units,
            in_stock: availableUnits.length > 0,
        };
    }

    static _decorateProduct(product, variants) {
        const activeVariants = variants.filter(
            (variant) => variant.status === 'ACTIVE'
        );

        return {
            ...product,
            ...this._aggregatePriceSummaries(activeVariants, product),
            is_new:
                Boolean(product.new_until) &&
                new Date(product.new_until) >= new Date(),
            in_stock: activeVariants.some((variant) => variant.in_stock),
        };
    }

    static _aggregatePriceSummaries(items, fallback = {}) {
        const pricedItems = items.filter(
            (item) =>
                Number.isFinite(item.min_price) &&
                Number.isFinite(item.max_price) &&
                item.max_price > 0
        );

        if (pricedItems.length === 0) {
            return {
                min_price: fallback.min_price || 0,
                max_price: fallback.max_price || 0,
                min_price_per_unit:
                    fallback.min_price_per_unit || 0,
                max_price_per_unit:
                    fallback.max_price_per_unit || 0,
                original_min_price:
                    fallback.original_min_price ??
                    fallback.min_price ??
                    0,
                original_max_price:
                    fallback.original_max_price ??
                    fallback.max_price ??
                    0,
                original_min_price_per_unit:
                    fallback.original_min_price_per_unit ??
                    fallback.min_price_per_unit ??
                    0,
                original_max_price_per_unit:
                    fallback.original_max_price_per_unit ??
                    fallback.max_price_per_unit ??
                    0,
                is_on_sale: false,
                max_discount_percent: 0,
            };
        }

        return {
            min_price: Math.min(
                ...pricedItems.map((item) => item.min_price)
            ),
            max_price: Math.max(
                ...pricedItems.map((item) => item.max_price)
            ),
            min_price_per_unit: Math.min(
                ...pricedItems.map((item) => item.min_price_per_unit)
            ),
            max_price_per_unit: Math.max(
                ...pricedItems.map((item) => item.max_price_per_unit)
            ),
            original_min_price: Math.min(
                ...pricedItems.map(
                    (item) =>
                        item.original_min_price ?? item.min_price
                )
            ),
            original_max_price: Math.max(
                ...pricedItems.map(
                    (item) =>
                        item.original_max_price ?? item.max_price
                )
            ),
            original_min_price_per_unit: Math.min(
                ...pricedItems.map(
                    (item) =>
                        item.original_min_price_per_unit ??
                        item.min_price_per_unit
                )
            ),
            original_max_price_per_unit: Math.max(
                ...pricedItems.map(
                    (item) =>
                        item.original_max_price_per_unit ??
                        item.max_price_per_unit
                )
            ),
            is_on_sale: pricedItems.some((item) => item.is_on_sale),
            max_discount_percent: Math.max(
                ...pricedItems.map(
                    (item) => item.max_discount_percent || 0
                )
            ),
        };
    }

    static _sortDecoratedProducts(products, sortBy, preserveOrder) {
        if (preserveOrder) {
            return products;
        }

        const sorted = [...products];
        const compareNewest = (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0);

        if (sortBy === 'popular') {
            return sorted.sort(
                (a, b) =>
                    Number(Boolean(b.is_best_seller)) -
                    Number(Boolean(a.is_best_seller)) ||
                    (b.sold_count || 0) - (a.sold_count || 0) ||
                    (b.rating_avg || 0) - (a.rating_avg || 0)
            );
        }
        if (sortBy === 'rating') {
            return sorted.sort(
                (a, b) =>
                    (b.rating_avg || 0) - (a.rating_avg || 0) ||
                    compareNewest(a, b)
            );
        }
        if (sortBy === 'price_asc') {
            return sorted.sort(
                (a, b) =>
                    (a.min_price || 0) - (b.min_price || 0) ||
                    compareNewest(a, b)
            );
        }
        if (sortBy === 'price_desc') {
            return sorted.sort(
                (a, b) =>
                    (b.max_price || 0) - (a.max_price || 0) ||
                    compareNewest(a, b)
            );
        }

        return sorted.sort(compareNewest);
    }

    static _splitProductPayload(data = {}) {
        const productData = { ...data };
        const simpleConfig = {};
        let hasSimpleConfig = false;

        for (const key of SIMPLE_PRODUCT_FIELD_KEYS) {
            if (Object.prototype.hasOwnProperty.call(productData, key)) {
                simpleConfig[key] = productData[key];
                delete productData[key];
                hasSimpleConfig = true;
            }
        }

        return {
            productData,
            simpleConfig,
            hasSimpleConfig,
        };
    }

    static _generateSimpleSku(product) {
        const source = product.slug || product.name || product._id?.toString();
        const clean = String(source)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 40);

        return `${clean || 'PRODUCT'}-SIMPLE`;
    }

    static _resolveSimpleConfig(simpleConfig = {}, currentUnit = null, currentVariant = null) {
        const pick = (key, fallback) =>
            simpleConfig[key] !== undefined && simpleConfig[key] !== null
                ? simpleConfig[key]
                : fallback;

        const price = Number(
            pick(
                'simple_price',
                currentUnit?.price_tiers?.[0]?.unit_price || 0
            )
        );
        const packSize = Number(pick('simple_pack_size', currentUnit?.pack_size || 1));
        const minOrderQty = Number(
            pick('simple_min_order_qty', currentUnit?.min_order_qty || 1)
        );
        const maxOrderQty = pick(
            'simple_max_order_qty',
            currentUnit?.max_order_qty || null
        );
        const qtyStep = Number(pick('simple_qty_step', currentUnit?.qty_step || 1));
        const availableStock = Number(
            pick('simple_stock', currentVariant?.stock?.available || 0)
        );

        if (!Number.isInteger(price) || price <= 0) {
            throw new AppError(
                'Simple product price must be greater than 0',
                400,
                'INVALID_SIMPLE_PRODUCT_PRICE'
            );
        }

        return {
            unit_type: pick('simple_unit_type', currentUnit?.unit_type || 'PACK'),
            display_name:
                String(
                    pick(
                        'simple_unit_display_name',
                        currentUnit?.display_name || 'Đơn vị'
                    )
                ).trim() || 'Đơn vị',
            pack_size: Number.isInteger(packSize) && packSize > 0 ? packSize : 1,
            price,
            stock: Number.isInteger(availableStock) && availableStock >= 0
                ? availableStock
                : 0,
            min_order_qty:
                Number.isInteger(minOrderQty) && minOrderQty > 0 ? minOrderQty : 1,
            max_order_qty:
                maxOrderQty === '' || maxOrderQty === undefined
                    ? null
                    : maxOrderQty,
            qty_step: Number.isInteger(qtyStep) && qtyStep > 0 ? qtyStep : 1,
        };
    }

    static _buildSimplePriceCache(config) {
        const pricePerUnit = Math.round(config.price / config.pack_size);

        return {
            min_price: config.price,
            max_price: config.price,
            min_price_per_unit: pricePerUnit,
            max_price_per_unit: pricePerUnit,
        };
    }

    static _buildSimpleSalesSummary(variant) {
        if (!variant) {
            return null;
        }

        const unit = Array.isArray(variant.units)
            ? variant.units.find((item) => item.is_default) || variant.units[0]
            : null;

        if (!unit) {
            return null;
        }

        return {
            variant_id: variant._id?.toString(),
            unit_id: unit._id?.toString(),
            unit_type: unit.unit_type,
            display_name: unit.display_name,
            pack_size: unit.pack_size,
            price: unit.price_tiers?.[0]?.unit_price || 0,
            stock: variant.stock?.available || 0,
            min_order_qty: unit.min_order_qty || 1,
            max_order_qty: unit.max_order_qty || null,
            qty_step: unit.qty_step || 1,
        };
    }

    static async _upsertSimpleSalesSetup(product, simpleConfig = {}, options = {}) {
        const { session = null } = options;
        const variants = await Variant.find(
            { product_id: product._id },
            null,
            { includeDeleted: false, session }
        );

        if (variants.length > 1) {
            throw new AppError(
                'Cannot use SIMPLE product type when product has multiple variants',
                409,
                'SIMPLE_PRODUCT_HAS_MULTIPLE_VARIANTS'
            );
        }

        let variant = variants[0] || null;
        const units = variant
            ? await VariantUnit.find({ variant_id: variant._id }, null, { session })
            : [];

        if (units.length > 1) {
            throw new AppError(
                'Cannot use SIMPLE product type when product has multiple units',
                409,
                'SIMPLE_PRODUCT_HAS_MULTIPLE_UNITS'
            );
        }

        const currentUnit = units[0] || null;
        const config = this._resolveSimpleConfig(
            simpleConfig,
            currentUnit,
            variant
        );
        const priceCache = this._buildSimplePriceCache(config);

        if (!variant) {
            variant = new Variant({
                product_id: product._id,
                sku: this._generateSimpleSku(product),
                size: INTERNAL_SIMPLE_SIZE,
                fabric_type: INTERNAL_SIMPLE_FABRIC_TYPE,
                stock: {
                    available: config.stock,
                    reserved: 0,
                    sold: 0,
                },
                status: 'ACTIVE',
                ...priceCache,
            });
        } else {
            variant.set({
                sku: variant.sku || this._generateSimpleSku(product),
                size: INTERNAL_SIMPLE_SIZE,
                fabric_type: INTERNAL_SIMPLE_FABRIC_TYPE,
                stock: {
                    available: config.stock,
                    reserved: variant.stock?.reserved || 0,
                    sold: variant.stock?.sold || 0,
                },
                status: 'ACTIVE',
                ...priceCache,
            });
        }

        await variant.save({ session });

        if (!currentUnit) {
            const unit = new VariantUnit({
                variant_id: variant._id,
                unit_type: config.unit_type,
                display_name: config.display_name,
                pack_size: config.pack_size,
                price_tiers: [
                    {
                        min_qty: 1,
                        max_qty: null,
                        unit_price: config.price,
                    },
                ],
                min_order_qty: config.min_order_qty,
                max_order_qty: config.max_order_qty,
                qty_step: config.qty_step,
                is_default: true,
                currency: 'VND',
            });

            await unit.save({ session });
        } else {
            currentUnit.set({
                unit_type: config.unit_type,
                display_name: config.display_name,
                pack_size: config.pack_size,
                price_tiers: [
                    {
                        min_qty: 1,
                        max_qty: null,
                        unit_price: config.price,
                    },
                ],
                min_order_qty: config.min_order_qty,
                max_order_qty: config.max_order_qty,
                qty_step: config.qty_step,
                is_default: true,
                currency: currentUnit.currency || 'VND',
            });

            await currentUnit.save({ session });
        }

        product.set(priceCache);
        await product.save({ session });

        return variant;
    }

    static _buildFieldChanges(before, after, fields) {
        return fields.reduce((changes, field) => {
            const fromValue = this._toAuditValue(before?.[field]);
            const toValue = this._toAuditValue(after?.[field]);

            if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
                changes[field] = {
                    from: fromValue,
                    to: toValue,
                };
            }

            return changes;
        }, {});
    }

    static _toAuditValue(value) {
        if (value === undefined || value === null) return null;
        if (value instanceof Date) return value;
        if (value?.toString && value.constructor?.name === 'ObjectId') {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this._toAuditValue(item));
        }
        if (value?.toObject) {
            return this._toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this._toAuditValue(item),
                ])
            );
        }
        return value;
    }

    static async _createProductAuditLog({
        action,
        targetType,
        product,
        actorId = null,
        actorType = 'USER',
        metadata = {},
        changes = {},
    }) {
        await ProductAuditLogService.createLog({
            actor_id: actorId,
            actor_type: actorType,
            action,
            target_type: targetType,
            product_id: product?._id || null,
            variant_id: null,
            unit_id: null,
            sku: null,
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = ProductService;
