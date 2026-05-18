const Banner = require('./banner.model');
const BannerMapper = require('./banner.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

class BannerService {
    static writableFields = [
        'image',
        'link',
        'location',
        'sort_order',
        'start_at',
        'end_at'
    ];

    static sanitizeBannerData(data = {}) {
        return this.writableFields.reduce((payload, field) => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                payload[field] = data[field];
            }

            return payload;
        }, {});
    }

    static async getActiveByLocation(location) {
        const now = new Date();

        const banners = await Banner.find({
            location,
            is_deleted: false,
            start_at: { $lte: now },
            end_at: { $gt: now }
        })
            .sort({ sort_order: 1 })
            .select('-created_by -updated_by')
            .exec();

        return BannerMapper.toDTOList(banners);
    }

    static async getAll(filters = {}) {
        const query = { is_deleted: false };

        if (filters.location) {
            query.location = filters.location;
        }

        const banners = await Banner.find(query)
            .sort({ location: 1, sort_order: 1 })
            .exec();

        return BannerMapper.toDTOList(banners);
    }

    static async getBannerById(bannerId) {
        const banner = await Banner.findById(bannerId);

        if (!banner) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

        return BannerMapper.toDTO(banner);
    }

    static async createBanner(data, userId) {
        const bannerData = this.sanitizeBannerData(data);

        const existing = await Banner.findOne({
            location: bannerData.location,
            sort_order: bannerData.sort_order,
            is_deleted: false
        });

        if (existing) {
            throw new AppError(
                `Banner with sort_order ${bannerData.sort_order} already exists at ${bannerData.location}`,
                409,
                'BANNER_DUPLICATE_SORT_ORDER'
            );
        }

        const banner = new Banner({
            ...bannerData,
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

    static async updateBanner(bannerId, data, userId) {
        const updateData = this.sanitizeBannerData(data);

        const banner = await Banner.findById(bannerId);

        if (!banner) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

        if (
            (updateData.location && updateData.location !== banner.location) ||
            (updateData.sort_order !== undefined && updateData.sort_order !== banner.sort_order)
        ) {
            const conflict = await Banner.findOne({
                _id: { $ne: bannerId },
                location: updateData.location || banner.location,
                sort_order: updateData.sort_order !== undefined ? updateData.sort_order : banner.sort_order,
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

        Object.assign(banner, updateData, { updated_by: userId });

        await banner.save();

        logger.info({
            event: 'banner_updated',
            banner_id: bannerId,
            updated_by: userId,
            updated_fields: Object.keys(updateData)
        });

        return BannerMapper.toDTO(banner);
    }

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

    static async getDeletedBanners() {
        const banners = await Banner.find(
            { is_deleted: true },
            null,
            { includeDeleted: true }
        )
            .sort({ deleted_at: -1 })
            .exec();

        return BannerMapper.toDTOList(banners);
    }

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
