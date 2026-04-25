class ShopInfoMapper {
    /**
     * Convert single document to DTO
     * ✅ Handle null safely
     * ✅ Normalize ID (_id → id)
     * ✅ Map nested objects (working_hours, social_links)
     * ✅ Format dates as ISO string
     * ✅ Whitelist fields (no spread operator)
     */
    static toDTO(doc) {
        if (!doc) return null;

        return {
            // Identity
            id: doc._id.toString(),

            // Shop Information
            shop_name: doc.shop_name || null,
            email: doc.email || null,
            phone: doc.phone || null,
            address: doc.address || null,

            // Contact Hours (CRITICAL: map each day object)
            working_hours: this.mapWorkingHours(doc.working_hours),

            // Social Links (CRITICAL: map nested object safely)
            social_links: this.mapSocialLinks(doc.social_links),

            // Map Embed
            map_embed_url: doc.map_embed_url || null,

            // Status
            is_active: Boolean(doc.is_active),

            // Audit Trail
            created_at: doc.created_at?.toISOString() || null,
            updated_at: doc.updated_at?.toISOString() || null
        };
    }

    /**
     * Map working_hours array
     * ✅ Handle null/undefined safely
     * ✅ Always return array (never null)
     * ✅ Each element is normalized object
     */
    static mapWorkingHours(hours) {
        if (!hours || !Array.isArray(hours) || hours.length === 0) {
            return [];
        }

        return hours.map((hour) => ({
            day: hour.day || null,
            open: hour.open || null,
            close: hour.close || null
        }));
    }

    /**
     * Map social_links object
     * ✅ Handle null/undefined safely
     * ✅ Always return object (never null)
     * ✅ Each field defaults to null (not undefined)
     */
    static mapSocialLinks(links) {
        if (!links) {
            return {
                facebook: null,
                zalo: null,
                instagram: null,
                shoppe: null
            };
        }

        return {
            facebook: links.facebook || null,
            zalo: links.zalo || null,
            instagram: links.instagram || null,
            shoppe: links.shoppe || null
        };
    }

    /**
     * Convert list of documents to DTOs
     * ✅ Always return array (never null)
     * ✅ Each element is mapped via toDTO
     * ✅ Handles empty list safely
     * 
     * NOTE: ShopInfo collection typically has only 1 document (singleton)
     *       but kept as list mapper for consistency with other modules
     */
    static toDTOList(docs) {
        if (!docs || docs.length === 0) return [];
        return docs.map((doc) => this.toDTO(doc));
    }

    /**
     * Format for contact/business card display
     * (Optional: lighter DTO for list views)
     */
    static toContactDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            shop_name: doc.shop_name || null,
            email: doc.email || null,
            phone: doc.phone || null,
            address: doc.address || null,
            is_active: Boolean(doc.is_active)
        };
    }

    /**
     * Format for social media integration
     * (Returns only social_links for embedding)
     */
    static toSocialDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            shop_name: doc.shop_name || null,
            social_links: this.mapSocialLinks(doc.social_links),
            is_active: Boolean(doc.is_active)
        };
    }

    /**
     * Format for hours display (e.g., storefront widget)
     * Returns working hours with shop name only
     */
    static toHoursDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            shop_name: doc.shop_name || null,
            working_hours: this.mapWorkingHours(doc.working_hours),
            is_active: Boolean(doc.is_active)
        };
    }
}

module.exports = ShopInfoMapper;