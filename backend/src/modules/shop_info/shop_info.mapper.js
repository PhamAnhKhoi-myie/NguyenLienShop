class ShopInfoMapper {
    static toDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),

            shop_name: doc.shop_name || null,
            email: doc.email || null,
            phone: doc.phone || null,
            address: doc.address || null,
            shipping_partner: doc.shipping_partner || null,

            working_hours: this.mapWorkingHours(doc.working_hours),

            social_links: this.mapSocialLinks(doc.social_links),
            certification_links: this.mapCertificationLinks(doc.certification_links),

            map_embed_url: doc.map_embed_url || null,

            is_active: Boolean(doc.is_active),

            created_at: doc.created_at?.toISOString() || null,
            updated_at: doc.updated_at?.toISOString() || null
        };
    }

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

    static mapSocialLinks(links) {
        if (!links) {
            return {
                facebook: null,
                zalo: null,
                instagram: null,
                shoppe: null,
                tiktok: null
            };
        }

        return {
            facebook: links.facebook || null,
            zalo: links.zalo || null,
            instagram: links.instagram || null,
            shoppe: links.shoppe || null,
            tiktok: links.tiktok || null
        };
    }

    static mapCertificationLinks(links) {
        if (!links) {
            return {
                ministry_notified: null,
                ministry_registered: null,
                extra: null
            };
        }

        return {
            ministry_notified: links.ministry_notified || null,
            ministry_registered: links.ministry_registered || null,
            extra: links.extra || null
        };
    }

    static toDTOList(docs) {
        if (!docs || docs.length === 0) return [];
        return docs.map((doc) => this.toDTO(doc));
    }

    static toContactDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            shop_name: doc.shop_name || null,
            email: doc.email || null,
            phone: doc.phone || null,
            address: doc.address || null,
            shipping_partner: doc.shipping_partner || null,
            is_active: Boolean(doc.is_active)
        };
    }

    static toSocialDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            shop_name: doc.shop_name || null,
            social_links: this.mapSocialLinks(doc.social_links),
            is_active: Boolean(doc.is_active)
        };
    }

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
