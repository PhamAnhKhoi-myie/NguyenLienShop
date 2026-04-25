class AnnouncementMapper {
    /**
     * Convert single document to DTO
     * ✅ Handle null safely
     * ✅ Normalize ID (_id → id)
     * ✅ Compute is_active from time
     * ✅ Format dates as ISO string
     * ✅ Whitelist fields (no spread operator)
     */
    static toDTO(doc) {
        if (!doc) return null;

        const now = new Date();
        const isActive = doc.start_at <= now && now < doc.end_at;

        return {
            // Identity
            id: doc._id.toString(),

            // Content
            title: doc.title,
            content: doc.content,

            // Configuration
            priority: doc.priority,
            target: doc.target || 'all',
            type: doc.type || 'info',
            is_dismissible: Boolean(doc.is_dismissible),

            // Scheduling
            start_at: doc.start_at?.toISOString(),
            end_at: doc.end_at?.toISOString(),

            // ✅ Computed field (source of truth from time, not stored)
            is_active: isActive,

            // Audit
            created_at: doc.created_at?.toISOString(),
            updated_at: doc.updated_at?.toISOString(),
            created_by: doc.created_by?.toString() || null
        };
    }

    /**
     * Convert list of documents to DTOs
     * ✅ Always return array (never null)
     * ✅ Each element is mapped via toDTO
     * ✅ Handles empty list safely
     */
    static toDTOList(docs) {
        if (!docs || docs.length === 0) return [];
        return docs.map((doc) => this.toDTO(doc));
    }

    /**
     * Helper: Check if announcement is active
     * Used by service for filtering
     */
    static isActive(doc) {
        const now = new Date();
        return doc.start_at <= now && now < doc.end_at;
    }

    /**
     * Helper: Check if announcement is scheduled (not started yet)
     */
    static isScheduled(doc) {
        const now = new Date();
        return doc.start_at > now;
    }

    /**
     * Helper: Check if announcement is expired
     */
    static isExpired(doc) {
        const now = new Date();
        return doc.end_at <= now;
    }
}

module.exports = AnnouncementMapper;