const Banner = require('./banner.model');
const BannerMapper = require('./banner.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

class BannerService {
    /**
     * Get active banners by location (public endpoint)
     * ✅ Only return currently active banners (start_at ≤ now < end_at)
     * ✅ Sorted by sort_order
     * ✅ Exclude audit fields from public response
     */
    static async getActiveByLocation(location) {
        const now = new Date();

        const banners = await Banner.find({
            location,
            is_deleted: false,
            start_at: { $lte: now },
            end_at: { $gt: now }
        })
            .sort({ sort_order: 1 })
            .select('-created_by -updated_by') // Don't expose audit fields to public
            .exec();

        return BannerMapper.toDTOList(banners);
    }

    /**
     * Get all banners (admin only)
     * ✅ Return all non-deleted banners (active + scheduled)
     * ✅ Optional location filter
     */
    static async getAll(filters = {}) {
        const query = { is_deleted: false };

        // Optional: filter by location
        if (filters.location) {
            query.location = filters.location;
        }

        const banners = await Banner.find(query)
            .sort({ location: 1, sort_order: 1 })
            .exec();

        return BannerMapper.toDTOList(banners);
    }

    /**
     * Create new banner
     * ✅ Validation already done by middleware
     * ✅ Check duplicate sort_order in location (unique constraint)
     * ✅ Audit trail (created_by)
     * ✅ Structured logging
     */
    static async createBanner(data, userId) {
        // Check for duplicate sort_order + location combination
        // (This is also enforced by partial unique index in model)
        const existing = await Banner.findOne({
            location: data.location,
            sort_order: data.sort_order,
            is_deleted: false
        });

        if (existing) {
            throw new AppError(
                `Banner with sort_order ${data.sort_order} already exists at ${data.location}`,
                409,
                'BANNER_DUPLICATE_SORT_ORDER'
            );
        }

        const banner = new Banner({
            ...data,
            created_by: userId
        });

        await banner.save();

        logger.info({
            event: 'banner_created',
            banner_id: banner._id.toString(),
            location: banner.location,
            sort_order: banner.sort_order,
            created_by: userId
        });

        return BannerMapper.toDTO(banner);
    }

    /**
     * Update banner
     * ✅ Check ownership (banner exists)
     * ✅ Prevent duplicate sort_order if location/sort changed
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
    static async updateBanner(bannerId, data, userId) {
        const banner = await Banner.findById(bannerId);

        if (!banner) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

        // Check for sort_order conflict if location or sort_order changed
        if (
            (data.location && data.location !== banner.location) ||
            (data.sort_order !== undefined && data.sort_order !== banner.sort_order)
        ) {
            const conflict = await Banner.findOne({
                _id: { $ne: bannerId },
                location: data.location || banner.location,
                sort_order: data.sort_order !== undefined ? data.sort_order : banner.sort_order,
                is_deleted: false
            });

            if (conflict) {
                throw new AppError(
                    'Another banner already uses this location + sort_order',
                    409,
                    'BANNER_DUPLICATE_SORT_ORDER'
                );
            }
        }

        // Update fields and audit trail
        Object.assign(banner, data, { updated_by: userId });

        await banner.save();

        logger.info({
            event: 'banner_updated',
            banner_id: bannerId,
            updated_by: userId,
            updated_fields: Object.keys(data)
        });

        return BannerMapper.toDTO(banner);
    }

    /**
     * Soft delete banner
     * ✅ Set is_deleted = true, deleted_at = now
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
    static async deleteBanner(bannerId, userId) {
        const result = await Banner.updateOne(
            { _id: bannerId },
            {
                is_deleted: true,
                deleted_at: new Date(),
                updated_by: userId
            }
        );

        if (result.matchedCount === 0) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

        logger.info({
            event: 'banner_deleted',
            banner_id: bannerId,
            deleted_by: userId
        });
    }

    /**
     * Get deleted banners (admin recovery)
     * ✅ Bypass auto-filter middleware with includeDeleted option
     * ✅ Sorted by deleted_at (newest first)
     */
    static async getDeletedBanners() {
        const banners = await Banner.find(
            { is_deleted: true },
            null,
            { includeDeleted: true } // Bypass the pre-find middleware
        )
            .sort({ deleted_at: -1 })
            .exec();

        return BannerMapper.toDTOList(banners);
    }

    /**
     * Restore deleted banner
     * ✅ Set is_deleted = false, deleted_at = null
     * ✅ Audit trail (updated_by)
     * ✅ Structured logging
     */
    static async restoreBanner(bannerId, userId) {
        const result = await Banner.updateOne(
            { _id: bannerId },
            {
                is_deleted: false,
                deleted_at: null,
                updated_by: userId
            }
        );

        if (result.matchedCount === 0) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

        logger.info({
            event: 'banner_restored',
            banner_id: bannerId,
            restored_by: userId
        });

        const banner = await Banner.findById(bannerId);
        return BannerMapper.toDTO(banner);
    }
}

module.exports = BannerService;