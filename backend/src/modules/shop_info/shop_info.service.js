const ShopInfo = require('./shop_info.model');
const ShopInfoMapper = require('./shop_info.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');
const {
    isOpeningRange,
    isValidTime
} = require('./shop_info_time.util');

class ShopInfoService {
    static async getShopInfo() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not configured',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        logger.info({
            event: 'shop_info_retrieved',
            shop_id: shopInfo._id.toString()
        });

        return ShopInfoMapper.toDTO(shopInfo);
    }

    static async getContactInfo() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not configured',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        return ShopInfoMapper.toContactDTO(shopInfo);
    }

    static async getWorkingHours() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not configured',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        return ShopInfoMapper.toHoursDTO(shopInfo);
    }

    static async getSocialLinks() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not configured',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        return ShopInfoMapper.toSocialDTO(shopInfo);
    }

    static async createShopInfo(data) {
        const existing = await ShopInfo.findOne();

        if (existing) {
            throw new AppError(
                'Shop information already exists. Use update instead.',
                409,
                'SHOP_INFO_ALREADY_EXISTS'
            );
        }

        this.validateShopInfoData(data);

        const shopInfo = new ShopInfo({
            shop_name: data.shop_name.trim(),
            email: data.email.toLowerCase().trim(),
            phone: data.phone.trim(),
            address: data.address,
            working_hours: data.working_hours || [],
            social_links: data.social_links || {},
            map_embed_url: data.map_embed_url || null,
            is_active: data.is_active !== undefined ? data.is_active : true
        });

        await shopInfo.save();

        logger.info({
            event: 'shop_info_created',
            shop_id: shopInfo._id.toString(),
            shop_name: shopInfo.shop_name
        });

        return ShopInfoMapper.toDTO(shopInfo);
    }

    static async updateShopInfo(data) {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not found',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        const changes = {};

        if (data.shop_name !== undefined) {
            changes.shop_name = data.shop_name;
            shopInfo.shop_name = data.shop_name.trim();
        }

        if (data.email !== undefined) {
            changes.email = data.email;
            shopInfo.email = data.email.toLowerCase().trim();
        }

        if (data.phone !== undefined) {
            changes.phone = data.phone;
            shopInfo.phone = data.phone.trim();
        }

        if (data.address !== undefined) {
            changes.address = data.address;
            shopInfo.address = data.address;
        }

        if (data.working_hours !== undefined) {
            changes.working_hours = data.working_hours.length;
            shopInfo.working_hours = data.working_hours;
        }

        if (data.social_links !== undefined) {
            changes.social_links = Object.keys(data.social_links).length;
            shopInfo.social_links = {
                ...shopInfo.social_links,
                ...data.social_links
            };
        }

        if (data.map_embed_url !== undefined) {
            changes.map_embed_url = !!data.map_embed_url;
            shopInfo.map_embed_url = data.map_embed_url;
        }

        if (data.is_active !== undefined) {
            changes.is_active = data.is_active;
            shopInfo.is_active = data.is_active;
        }

        await shopInfo.save();

        logger.info({
            event: 'shop_info_updated',
            shop_id: shopInfo._id.toString(),
            changes
        });

        return ShopInfoMapper.toDTO(shopInfo);
    }

    static async toggleShopStatus(isActive) {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not found',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        const previousStatus = shopInfo.is_active;
        shopInfo.is_active = isActive;

        await shopInfo.save();

        logger.info({
            event: 'shop_status_toggled',
            shop_id: shopInfo._id.toString(),
            previous_status: previousStatus,
            new_status: isActive
        });

        return ShopInfoMapper.toDTO(shopInfo);
    }

    static validateShopInfoData(data) {
        if (!data.shop_name || !data.shop_name.trim()) {
            throw new AppError(
                'Shop name is required',
                400,
                'VALIDATION_ERROR'
            );
        }

        if (!data.email) {
            throw new AppError(
                'Email is required',
                400,
                'VALIDATION_ERROR'
            );
        }

        if (!data.phone) {
            throw new AppError(
                'Phone is required',
                400,
                'VALIDATION_ERROR'
            );
        }

        if (!data.address) {
            throw new AppError(
                'Address is required',
                400,
                'VALIDATION_ERROR'
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new AppError(
                'Invalid email format',
                400,
                'VALIDATION_ERROR'
            );
        }

        if (data.working_hours && Array.isArray(data.working_hours)) {
            for (const hour of data.working_hours) {
                if (!hour.day || !hour.open || !hour.close) {
                    throw new AppError(
                        'Invalid working hours structure',
                        400,
                        'VALIDATION_ERROR'
                    );
                }

                if (!isValidTime(hour.open) || !isValidTime(hour.close)) {
                    throw new AppError(
                        'Invalid time format. Use HH:mm',
                        400,
                        'VALIDATION_ERROR'
                    );
                }

                if (!isOpeningRange(hour.open, hour.close)) {
                    throw new AppError(
                        'Opening time must be before closing time',
                        400,
                        'VALIDATION_ERROR'
                    );
                }
            }
        }
    }

    static async isShopOpen() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo || !shopInfo.is_active) {
            return false;
        }

        const now = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = dayNames[now.getDay()];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const todayHours = shopInfo.working_hours.find(
            (h) => h.day === currentDay
        );

        if (!todayHours) {
            return false;
        }

        return currentTime >= todayHours.open && currentTime < todayHours.close;
    }

    static async getNextOpeningTime() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo || !shopInfo.is_active) {
            return null;
        }

        const now = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        for (let i = 0; i < 7; i++) {
            const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
            const dayName = dayNames[futureDate.getDay()];

            const dayHours = shopInfo.working_hours.find(
                (h) => h.day === dayName
            );

            if (dayHours) {
                return {
                    date: futureDate.toISOString().split('T')[0],
                    time: dayHours.open,
                    day: dayName
                };
            }
        }

        return null;
    }
}

module.exports = ShopInfoService;
