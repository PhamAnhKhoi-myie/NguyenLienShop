const ShopInfo = require('./shop_info.model');
const ShopInfoMapper = require('./shop_info.mapper');
const AppError = require('../../utils/appError.util');
const logger = require('../../utils/logger.util');

class ShopInfoService {
    /**
     * Get shop information (singleton - only 1 document)
     * ✅ Handle not found gracefully
     * ✅ Return mapped DTO
     * ✅ Can be called by public/guest (no auth required)
     */
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

    /**
     * Get contact information only (lighter DTO)
     * ✅ Used for contact forms, footer, etc.
     * ✅ Return only essential contact details
     */
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

    /**
     * Get working hours only
     * ✅ Used for storefront widget, "Are we open?" checks
     * ✅ Return hours with shop name
     */
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

    /**
     * Get social media links only
     * ✅ Used for footer, social media embeds
     * ✅ Return only social_links
     */
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

    /**
     * Create shop information (ADMIN ONLY - typically called once)
     * ✅ Validate all required fields
     * ✅ Prevent duplicate creation (only 1 shop info allowed)
     * ✅ Log creation event
     */
    static async createShopInfo(data) {
        // Check if shop info already exists
        const existing = await ShopInfo.findOne();

        if (existing) {
            throw new AppError(
                'Shop information already exists. Use update instead.',
                409,
                'SHOP_INFO_ALREADY_EXISTS'
            );
        }

        // Validate required fields
        this.validateShopInfoData(data);

        // Create new shop info
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

    /**
     * Update shop information (ADMIN ONLY)
     * ✅ Partial updates allowed (all fields optional)
     * ✅ Validate provided fields only
     * ✅ Log update with changed fields
     * ✅ Maintain immutable created_at
     */
    static async updateShopInfo(data) {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo) {
            throw new AppError(
                'Shop information not found',
                404,
                'SHOP_INFO_NOT_FOUND'
            );
        }

        // Track what changed for logging
        const changes = {};

        // ✅ Only update fields that are provided
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

        // Save changes
        await shopInfo.save();

        logger.info({
            event: 'shop_info_updated',
            shop_id: shopInfo._id.toString(),
            changes
        });

        return ShopInfoMapper.toDTO(shopInfo);
    }

    /**
     * Activate/deactivate shop
     * ✅ Simple toggle for is_active flag
     * ✅ Useful for temporarily closing shop
     */
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

    /**
     * Helper: Validate shop info data structure
     * ✅ Checks required fields
     * ✅ Validates email format
     * ✅ Validates phone format
     * ✅ Validates working hours structure
     */
    static validateShopInfoData(data) {
        // Required fields
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

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new AppError(
                'Invalid email format',
                400,
                'VALIDATION_ERROR'
            );
        }

        // Working hours validation
        if (data.working_hours && Array.isArray(data.working_hours)) {
            for (const hour of data.working_hours) {
                if (!hour.day || !hour.open || !hour.close) {
                    throw new AppError(
                        'Invalid working hours structure',
                        400,
                        'VALIDATION_ERROR'
                    );
                }

                // Validate time format HH:mm
                const timeRegex = /^\d{2}:\d{2}$/;
                if (!timeRegex.test(hour.open) || !timeRegex.test(hour.close)) {
                    throw new AppError(
                        'Invalid time format. Use HH:mm',
                        400,
                        'VALIDATION_ERROR'
                    );
                }
            }
        }
    }

    /**
     * Check if shop is currently open
     * ✅ Based on current time and working_hours
     * ✅ Useful for UI badge "Open/Closed"
     */
    static async isShopOpen() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo || !shopInfo.is_active) {
            return false;
        }

        const now = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = dayNames[now.getDay()];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Find today's hours
        const todayHours = shopInfo.working_hours.find(
            (h) => h.day === currentDay
        );

        if (!todayHours) {
            return false;  // Closed today
        }

        // Compare times (string comparison works for HH:mm format)
        return currentTime >= todayHours.open && currentTime < todayHours.close;
    }

    /**
     * Get next opening time
     * ✅ Useful for "We open at..." message
     */
    static async getNextOpeningTime() {
        const shopInfo = await ShopInfo.findOne();

        if (!shopInfo || !shopInfo.is_active) {
            return null;
        }

        const now = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        // Search next 7 days
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

        return null;  // Shop closed all week
    }
}

module.exports = ShopInfoService;