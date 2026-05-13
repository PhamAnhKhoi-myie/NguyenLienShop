class NotificationMapper {
    static toDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            user_id: doc.user_id.toString(),

            type: doc.type,
            title: doc.title,
            message: doc.message,

            data: doc.data
                ? {
                    ref_type: doc.data.ref_type || null,
                    ref_id: doc.data.ref_id ? doc.data.ref_id.toString() : null,
                    extra: doc.data.extra || null
                }
                : null,

            priority: doc.priority,

            is_read: doc.read_at ? true : false,
            read_at: doc.read_at ? doc.read_at.toISOString() : null,

            delivered_at: doc.delivered_at
                ? doc.delivered_at.toISOString()
                : null,

            expire_at: doc.expire_at ? doc.expire_at.toISOString() : null,

            created_at: doc.created_at.toISOString()
        };
    }

    static toDTOList(docs) {
        if (!docs || docs.length === 0) return [];

        return docs.map((doc) => this.toDTO(doc));
    }

    static toPaginatedResponse(docs, page, limit, total) {
        return {
            data: this.toDTOList(docs),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
                has_more: page * limit < total
            }
        };
    }
}

module.exports = NotificationMapper;