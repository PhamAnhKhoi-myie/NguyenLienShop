class ReviewMapper {
    static toDTO(doc, currentUserId = null) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),

            user_id: doc.user_id.toString(),
            product_id: doc.product_id.toString(),
            variant_id: doc.variant_id.toString(),

            is_verified_purchase: Boolean(doc.is_verified_purchase),

            rating: {
                overall: doc.rating.overall,
                quality: doc.rating.quality || null,
                value_for_money: doc.rating.value_for_money || null,
                delivery_speed: doc.rating.delivery_speed || null
            },

            title: doc.title || null,
            content: doc.content,

            edit_count: doc.edit_count || 0,
            edited_at: doc.edited_at?.toISOString() || null,

            helpful_count: doc.helpful_count || 0,
            unhelpful_count: doc.unhelpful_count || 0,

            user_vote: currentUserId
                ? doc.helpful_by?.includes(currentUserId)
                    ? 'helpful'
                    : doc.unhelpful_by?.includes(currentUserId)
                        ? 'unhelpful'
                        : null
                : null,

            is_approved: Boolean(doc.is_approved),

            created_at: doc.created_at?.toISOString(),
            updated_at: doc.updated_at?.toISOString()
        };
    }

    static toDTOList(docs, currentUserId = null) {
        if (!docs || docs.length === 0) return [];

        return docs.map(doc => this.toDTO(doc, currentUserId));
    }

    static toPublicDTO(doc, currentUserId = null) {
        const dto = this.toDTO(doc, currentUserId);

        if (dto) {
            delete dto.is_approved;
            delete dto.is_flagged;
        }

        return dto;
    }

    static toPublicDTOList(docs, currentUserId = null) {
        if (!docs || docs.length === 0) return [];

        return docs.map(doc => this.toPublicDTO(doc, currentUserId));
    }

    static toAdminDTO(doc) {
        if (!doc) return null;

        const dto = this.toDTO(doc);

        return {
            ...dto,
            is_flagged: Boolean(doc.is_flagged),
            flag_reason: doc.flag_reason || null,
            approved_at: doc.approved_at?.toISOString() || null,
            approved_by: doc.approved_by?.toString() || null,
            rejected_at: doc.rejected_at?.toISOString() || null,
            rejection_reason: doc.rejection_reason || null,
            flagged_by: doc.flagged_by?.toString() || null
        };
    }

    static toAdminDTOList(docs) {
        if (!docs || docs.length === 0) return [];

        return docs.map(doc => this.toAdminDTO(doc));
    }
}

module.exports = ReviewMapper;