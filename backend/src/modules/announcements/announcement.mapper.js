class AnnouncementMapper {
    static toDTO(doc) {
        if (!doc) return null;

        const now = new Date();
        const isActive = doc.start_at <= now && now < doc.end_at;

        return {
            id: doc._id.toString(),

            title: doc.title,
            content: doc.content,

            priority: doc.priority,
            target: doc.target || 'all',
            type: doc.type || 'info',
            is_dismissible: Boolean(doc.is_dismissible),

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
        return docs.map((doc) => this.toDTO(doc));
    }

    static isActive(doc) {
        const now = new Date();
        return doc.start_at <= now && now < doc.end_at;
    }

    static isScheduled(doc) {
        const now = new Date();
        return doc.start_at > now;
    }

    static isExpired(doc) {
        const now = new Date();
        return doc.end_at <= now;
    }
}

module.exports = AnnouncementMapper;