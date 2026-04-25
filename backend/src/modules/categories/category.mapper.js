class CategoryMapper {
    /**
     * ✅ Convert Mongoose document → API Response DTO
     * - Expose: id, name, slug, description, parent_id, level, status, etc.
     * - Hide: _id, __v, internal fields
     * - Format: breadcrumb-friendly structure
     */
    static toResponseDTO(category) {
        if (!category) {
            return null;
        }

        return {
            id: category._id.toString(),
            name: category.name,
            slug: category.slug,
            description: category.description || null,
            parent_id: category.parent_id ? category.parent_id.toString() : null,
            level: category.level,
            path: category.path.map(id => id.toString()),
            status: category.status,
            icon_url: category.icon_url || null,
            image_url: category.image_url || null,
            display_order: category.display_order,
            is_deleted: category.is_deleted,
            deleted_at: category.deleted_at,
            created_at: category.created_at,
            updated_at: category.updated_at,
        };
    }

    /**
     * ✅ Convert array of documents → array of DTOs
     */
    static toResponseDTOList(categories) {
        if (!Array.isArray(categories)) {
            return [];
        }
        return categories.map(cat => this.toResponseDTO(cat));
    }

    /**
     * ✅ Convert để return nested tree structure (with children)
     * Dùng khi trả về getCategoryTree
     */
    static toTreeDTO(categoryNode) {
        if (!categoryNode) {
            return null;
        }

        return {
            id: categoryNode.id,
            name: categoryNode.name,
            slug: categoryNode.slug,
            description: categoryNode.description,
            parent_id: categoryNode.parent_id,
            level: categoryNode.level,
            status: categoryNode.status,
            icon_url: categoryNode.icon_url,
            image_url: categoryNode.image_url,
            display_order: categoryNode.display_order,
            created_at: categoryNode.created_at,
            updated_at: categoryNode.updated_at,
            // ✅ Include children nếu có (nested)
            children: categoryNode.children && Array.isArray(categoryNode.children)
                ? categoryNode.children.map(child => this.toTreeDTO(child))
                : [],
        };
    }

    /**
     * ✅ Convert breadcrumb array → DTO list
     * Dùng cho getCategoryBreadcrumb
     */
    static toBreadcrumbDTO(categories) {
        if (!Array.isArray(categories)) {
            return [];
        }
        return categories.map(cat => ({
            id: cat.id || cat._id.toString(),
            name: cat.name,
            slug: cat.slug,
            level: cat.level,
        }));
    }

    /**
     * ✅ Convert simple category info (lightweight)
     * Dùng khi cần return minimal data (nested product, order, etc.)
     */
    static toMinimalDTO(category) {
        if (!category) {
            return null;
        }

        return {
            id: category._id.toString(),
            name: category.name,
            slug: category.slug,
            level: category.level,
        };
    }
}

module.exports = CategoryMapper;