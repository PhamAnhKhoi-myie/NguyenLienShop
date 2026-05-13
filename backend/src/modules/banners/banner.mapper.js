class BannerMapper {
    static toDTO(doc) {
        if (!doc) return null;

        const now = new Date();
        const isActive = doc.start_at <= now && now < doc.end_at;

        return {
            id: doc._id.toString(),

            image: {
                url: doc.image.url,
                alt_text: doc.image.alt_text || ''
            },

            link: doc.link,

            location: doc.location,
            sort_order: doc.sort_order,

            start_at: doc.start_at?.toISOString(),
            end_at: doc.end_at?.toISOString(),

            is_active: isActive,

            created_at: doc.created_at?.toISOString(),
            updated_at: doc.updated_at?.toISOString(),
            created_by: doc.created_by?.toString() || null
        };
    }

    static toDTOList(docs) {
        if (!docs || docs.length === 0) return [];
        return docs.map(doc => this.toDTO(doc));
    }

    static isActive(doc) {
        const now = new Date();
        return doc.start_at <= now && now < doc.end_at;
    }
}

module.exports = BannerMapper;