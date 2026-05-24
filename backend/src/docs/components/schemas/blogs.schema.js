const blogStatusEnum = ["DRAFT", "PUBLISHED", "ARCHIVED"];

const blogThumbnailSchema = {
    type: "object",
    properties: {
        url: { type: "string", format: "uri", nullable: true, example: "https://res.cloudinary.com/demo/image/upload/blogs/tui-bao.jpg" },
        public_id: { type: "string", nullable: true, example: "nguyen-lien-shop/blogs/tui-bao" },
        alt: { type: "string", nullable: true, example: "Túi bao trái cây" },
    },
};

const blogSeoSchema = {
    type: "object",
    properties: {
        meta_title: { type: "string", nullable: true, maxLength: 160, example: "Cách sử dụng túi bao trái cây" },
        meta_description: { type: "string", nullable: true, maxLength: 300, example: "Hướng dẫn chọn và sử dụng túi bao trái cây đúng cách." },
        keywords: {
            type: "array",
            items: { type: "string" },
            example: ["túi bao trái cây", "hướng dẫn"],
        },
    },
};

module.exports = {
    BlogStatus: {
        type: "string",
        enum: blogStatusEnum,
        example: "PUBLISHED",
    },

    Blog: {
        type: "object",
        required: ["id", "title", "slug", "excerpt", "content", "status", "author", "view_count", "created_at", "updated_at"],
        properties: {
            id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439041" },
            title: { type: "string", example: "Cách sử dụng túi bao trái cây" },
            slug: { type: "string", example: "cach-su-dung-tui-bao-trai-cay" },
            excerpt: { type: "string", example: "Hướng dẫn chọn kích thước và thời điểm bao trái cây phù hợp." },
            content: { type: "string", example: "<h2>Chuẩn bị</h2><p>Chọn túi đúng kích thước...</p>" },
            thumbnail: blogThumbnailSchema,
            category: { type: "string", nullable: true, example: "Hướng dẫn sử dụng" },
            tags: {
                type: "array",
                items: { type: "string" },
                example: ["túi bao", "bưởi"],
            },
            status: { $ref: "#/components/schemas/BlogStatus" },
            author: {
                type: "object",
                nullable: true,
                properties: {
                    id: { type: "string", nullable: true, example: "507f1f77bcf86cd799439011" },
                    email: { type: "string", nullable: true, example: "admin@example.com" },
                    full_name: { type: "string", nullable: true, example: "Admin" },
                },
            },
            published_at: { type: "string", format: "date-time", nullable: true },
            view_count: { type: "integer", minimum: 0, example: 12 },
            seo: blogSeoSchema,
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
        },
    },

    BlogListItem: {
        allOf: [
            { $ref: "#/components/schemas/Blog" },
            {
                type: "object",
                properties: {
                    content: { readOnly: true },
                },
            },
        ],
    },

    CreateBlogInput: {
        type: "object",
        required: ["title", "excerpt", "content"],
        properties: {
            title: { type: "string", minLength: 3, maxLength: 180, example: "Cách sử dụng túi bao trái cây" },
            slug: { type: "string", example: "cach-su-dung-tui-bao-trai-cay" },
            excerpt: { type: "string", minLength: 10, maxLength: 500, example: "Hướng dẫn chọn kích thước và thời điểm bao trái cây phù hợp." },
            content: { type: "string", minLength: 20, example: "<h2>Chuẩn bị</h2><p>Chọn túi đúng kích thước...</p>" },
            thumbnail: blogThumbnailSchema,
            category: { type: "string", maxLength: 100, example: "Hướng dẫn sử dụng" },
            tags: {
                type: "array",
                maxItems: 12,
                items: { type: "string" },
                example: ["túi bao", "bưởi"],
            },
            status: { $ref: "#/components/schemas/BlogStatus" },
            seo: blogSeoSchema,
        },
    },

    UpdateBlogInput: {
        allOf: [{ $ref: "#/components/schemas/CreateBlogInput" }],
    },

    BlogResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Blog updated successfully" },
            data: { $ref: "#/components/schemas/Blog" },
        },
    },

    BlogListResponse: {
        type: "object",
        required: ["success", "data", "pagination"],
        properties: {
            success: { type: "boolean", example: true },
            data: {
                type: "array",
                items: { $ref: "#/components/schemas/BlogListItem" },
            },
            pagination: {
                type: "object",
                required: ["current_page", "total_pages", "total_items", "per_page"],
                properties: {
                    current_page: { type: "integer", example: 1 },
                    total_pages: { type: "integer", example: 3 },
                    total_items: { type: "integer", example: 25 },
                    per_page: { type: "integer", example: 12 },
                },
            },
        },
    },
};
