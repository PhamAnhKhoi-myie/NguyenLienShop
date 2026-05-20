const Banner = require('./banner.model');
const BannerMapper = require('./banner.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');
const ShopContentAuditLogService = require('../audit_logs/shop_content_audit_log/content_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

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

    static async createBanner(data, userId, metadata = {}) {
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

        await this._createBannerAuditLog({
            action: AUDIT_ACTIONS.CREATE_BANNER,
            banner,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildCreatedChanges(
                banner,
                [...this.writableFields, 'is_deleted']
            ),
        });

        logger.info({
            event: 'banner_created',
            banner_id: banner._id.toString(),
            location: banner.location,
            sort_order: banner.sort_order,
            created_by: userId
        });

        return BannerMapper.toDTO(banner);
    }

    static async updateBanner(bannerId, data, userId, metadata = {}) {
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

        const before = banner.toObject();

        Object.assign(banner, updateData, { updated_by: userId });

        await banner.save();

        await this._createBannerAuditLog({
            action: AUDIT_ACTIONS.UPDATE_BANNER,
            banner,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                banner,
                [...Object.keys(updateData), 'updated_by']
            ),
        });

        logger.info({
            event: 'banner_updated',
            banner_id: bannerId,
            updated_by: userId,
            updated_fields: Object.keys(updateData)
        });

        return BannerMapper.toDTO(banner);
    }

    static async deleteBanner(bannerId, userId, metadata = {}) {
        const before = await Banner.findById(bannerId)
            .setOptions({ includeDeleted: true });

        if (!before) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

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

        const banner = await Banner.findById(bannerId)
            .setOptions({ includeDeleted: true });

        await this._createBannerAuditLog({
            action: AUDIT_ACTIONS.DELETE_BANNER_SOFT,
            banner,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                banner,
                ['is_deleted', 'deleted_at', 'updated_by']
            ),
        });

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

    static async restoreBanner(bannerId, userId, metadata = {}) {
        const before = await Banner.findById(bannerId)
            .setOptions({ includeDeleted: true });

        if (!before) {
            throw new AppError(
                'Banner not found',
                404,
                'BANNER_NOT_FOUND'
            );
        }

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

        const banner = await Banner.findById(bannerId)
            .setOptions({ includeDeleted: true });

        await this._createBannerAuditLog({
            action: AUDIT_ACTIONS.RESTORE_BANNER,
            banner,
            actorId: userId,
            metadata,
            changes: ShopContentAuditLogService.buildUpdatedChanges(
                before,
                banner,
                ['is_deleted', 'deleted_at', 'updated_by']
            ),
        });

        logger.info({
            event: 'banner_restored',
            banner_id: bannerId,
            restored_by: userId
        });

        return BannerMapper.toDTO(banner);
    }

    static _getBannerPublicStatus(banner) {
        if (banner?.is_deleted) {
            return 'DELETED';
        }

        const now = new Date();

        if (banner?.start_at && banner.start_at > now) {
            return 'SCHEDULED';
        }
        if (banner?.end_at && banner.end_at <= now) {
            return 'EXPIRED';
        }

        return 'ACTIVE';
    }

    static async _createBannerAuditLog({
        action,
        banner,
        actorId,
        metadata = {},
        changes = {},
    }) {
        await ShopContentAuditLogService.createLog({
            actor_id: actorId,
            actor_type: 'ADMIN',
            action,
            target_type: 'BANNER',
            banner_id: banner._id,
            announcement_id: null,
            shop_info_id: null,
            display_name: `${banner.location}:${banner.sort_order}`,
            public_status: this._getBannerPublicStatus(banner),
            changes,
            ip_address: metadata.ip || null,
            user_agent: metadata.userAgent || null,
        });
    }
}

module.exports = BannerService;
