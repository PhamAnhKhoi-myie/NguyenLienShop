/**
 * OpenAPI 3 — định nghĩa tĩnh (static spec). app.js: swaggerUi.setup(swaggerSpec).
 */
const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "NguyenLien API",
        version: "1.0.0",
        description:
            "Manager API Documentation.",
    },
    servers: [{ url: "http://localhost:5000" }],
    tags: [
        {
            name: "Auth",
            description:
                "Đăng ký, đăng nhập, refresh access token, đăng xuất.",
        },
        {
            name: "Users",
            description:
                "Quản lý thông tin người dùng: lấy profile hiện tại, danh sách user, cập nhật profile, xoá mềm, cập nhật roles.",
        },
        {
            name: "User Addresses",
            description:
                "Quản lý địa chỉ giao hàng: tạo, lấy danh sách, cập nhật, đặt mặc định, xoá.",
        },
        {
            name: "Categories",
            description:
                "Quản lý danh mục sản phẩm: lấy cây phân cấp, danh sách phẳng, tạo, cập nhật, xoá mềm, restore.",
        },
        {
            name: "Products",
            description: "Quản lý sản phẩm: lấy danh sách, tìm kiếm, tạo, cập nhật, xoá mềm.",
        },
        {
            name: "Variants",
            description: "Quản lý biến thể sản phẩm: lấy danh sách, tạo, cập nhật, xoá mềm, quản lý tồn kho.",
        },
        {
            name: "Variant Units",
            description: "Quản lý đơn vị bán của biến thể: lấy danh sách, tạo, cập nhật, xoá, tính giá.",
        },
        {
            name: "Carts",
            description:
                "Quản lý giỏ hàng: tạo giỏ khách, lấy giỏ, thêm/cập nhật/xoá item, áp dụng discount, merge giỏ, checkout.",
        },
        {
            name: "Orders",
            description: "Quản lý đơn hàng: tạo từ cart, theo dõi, hủy, review, và quản lý admin.",
        },
        {
            name: "Payments",
            description: "Quản lý thanh toán: tạo payment, xử lý webhook, retry/cancel, lịch sử thanh toán.",
        },
        {
            name: "Discounts",
            description:
                "Quản lý mã giảm giá / voucher: tạo, cập nhật, danh sách, validate code, bulk import, thống kê sử dụng.",
        },
        {
            name: "Shipments",
            description: "Quản lý vận chuyển: tạo, theo dõi, cập nhật trạng thái, và quản lý admin.",
        },
        {
            name: "Reviews",
            description: "Quản lý đánh giá sản phẩm: tạo, cập nhật, xóa review, đánh giá hữu ích, và moderation admin.",
        },
        {
            name: "Banners",
            description: "Quản lý banner: tạo, cập nhật, xóa, lấy danh sách.",
        },
        {
            name: "Announcements",
            description: "Quản lý thông báo: tạo, cập nhật, xóa, lấy danh sách.",
        },
        {
            name: "Shop Info",
            description: "Quản lý thông tin cửa hàng: contact, giờ hoạt động, social links, trạng thái.",
        },
        {
            name: "Notifications",
            description: "Quản lý thông báo cho người dùng: lấy danh sách, đánh dấu đã đọc, xóa.",
        },
        {
            name: "Chats",
            description: "Chatbot trợ lý AI tích hợp Gemini"
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description:
                    "JWT access token. Header: `Authorization: Bearer <accessToken>`. Chỉ dùng cho các endpoint backend thực sự kiểm tra Bearer (vd. sau khi bạn gắn authMiddleware).",
            },
            refreshTokenCookie: {
                type: "apiKey",
                in: "cookie",
                name: "refreshToken",
                description:
                    "Refresh token cookie (httpOnly). Đăng nhập thành công sẽ được server Set-Cookie; Swagger UI → Authorize → nhập giá trị cookie nếu test tay.",
            },
        },
        responses: {
            BadRequest: {
                description: "Bad Request / Validation",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
            NotFound: {
                description: "Not Found",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
            Unauthorized: {
                description: "Unauthorized",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
            Forbidden: {
                description: "Forbidden",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
            Conflict: {
                description: "Conflict",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
            InternalError: {
                description: "Internal Server Error",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                },
            },
        },
        schemas: {
            RegisterInput: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: {
                        type: "string",
                        minLength: 6,
                        description: "Khớp Zod register (tối thiểu 6 ký tự).",
                    },
                    full_name: {
                        type: "string",
                        minLength: 2,
                        description: "Khớp Zod register (tối thiểu 2 ký tự).",
                    },
                },
                required: ["email", "password"],
                example: {
                    email: "test@example.com",
                    password: "test"
                },
            },
            LoginInput: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: {
                        type: "string",
                        minLength: 1,
                        description: "Khớp Zod login (bắt buộc, ≥1 ký tự).",
                    },
                },
                required: ["email", "password"],
                example: {
                    email: "test@example.com",
                    password: "test",
                },
            },
            UserPublic: {
                type: "object",
                description: "Thông tin user trả về cho client (không có password).",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "MongoDB ObjectId dạng chuỗi hex 24 ký tự",
                        example: "507f1f77bcf86cd799439011",
                    },
                    email: { type: "string", format: "email", example: "user@example.com" },
                    full_name: { type: "string", example: "Nguyen Van A" },
                    roles: {
                        type: "array",
                        items: {
                            type: "string",
                            enum: ["CUSTOMER", "MANAGER", "ADMIN"],
                        },
                        example: ["CUSTOMER"],
                    },
                },
                required: ["id", "email", "full_name", "roles"],
            },
            UserProfileInput: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        description: "Tên hiển thị / full name.",
                    },
                    avatar: {
                        type: "string",
                        format: "uri",
                        description: "URL avatar.",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Email mới (nếu cho phép cập nhật).",
                    },
                    phone: {
                        type: "string",
                        description: "Số điện thoại.",
                    },
                },
                example: {
                    name: "Nguyen Van B",
                    avatar: "https://example.com/avatar.png",
                    email: "new@example.com",
                    phone: "0912345678",
                },
            },
            UpdateUserRolesInput: {
                type: "object",
                properties: {
                    roles: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "string",
                            enum: ["CUSTOMER", "MANAGER", "ADMIN"],
                        },
                    },
                },
                required: ["roles"],
                example: {
                    roles: ["MANAGER"],
                },
            },
            UserListItem: {
                allOf: [
                    { $ref: "#/components/schemas/UserPublic" },
                    {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
                            },
                            is_email_verified: { type: "boolean" },
                            email_verified_at: { type: ["string", "null"], format: "date-time" },
                            last_login_at: { type: ["string", "null"], format: "date-time" },
                            created_at: { type: ["string", "null"], format: "date-time" },
                            updated_at: { type: ["string", "null"], format: "date-time" },
                            profile: {
                                type: "object",
                                properties: {
                                    avatar_url: { type: ["string", "null"], example: "https://example.com/avatar.png" },
                                    phone_number: { type: ["string", "null"], example: "0912345678" },
                                },
                            },
                        },
                    },
                ],
            },
            UserProfileResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserListItem" },
                },
                required: ["success", "data"],
            },
            UsersListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/UserListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            current_page: { type: "integer", example: 1 },
                            total_pages: { type: "integer", example: 1 },
                            total_items: { type: "integer", example: 1 },
                            per_page: { type: "integer", example: 20 },
                        },
                        required: ["current_page", "total_pages", "total_items", "per_page"],
                    },
                },
                required: ["success", "data", "pagination"],
            },
            UpdateUserResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User updated successfully" },
                    data: { $ref: "#/components/schemas/UserListItem" },
                },
                required: ["success", "message", "data"],
            },
            DeleteUserResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User deleted successfully" },
                },
                required: ["success", "message"],
            },
            UpdateRolesResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "User roles updated successfully" },
                    data: { $ref: "#/components/schemas/UserListItem" },
                },
                required: ["success", "message", "data"],
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: false },
                    code: { type: "string", example: "INVALID_CREDENTIALS" },
                    message: { type: "string", example: "Email hoặc mật khẩu không đúng" },
                },
                required: ["success", "code", "message"],
                example: {
                    success: false,
                    code: "VALIDATION_ERROR",
                    message: "Invalid email",
                },
            },
            RegisterSuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng ký thành công" },
                    data: {
                        type: "object",
                        properties: {
                            user: { $ref: "#/components/schemas/UserPublic" },
                        },
                        required: ["user"],
                    },
                },
                required: ["success", "message", "data"],
                example: {
                    success: true,
                    message: "Đăng ký thành công",
                    data: {
                        user: {
                            id: "507f1f77bcf86cd799439011",
                            email: "new.user@example.com",
                            full_name: "Nguyen Van A",
                            roles: ["CUSTOMER"],
                        },
                    },
                },
            },
            LoginSuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng nhập thành công" },
                    data: {
                        type: "object",
                        properties: {
                            accessToken: { type: "string", description: "JWT access token" },
                            user: { $ref: "#/components/schemas/UserPublic" },
                        },
                        required: ["accessToken", "user"],
                    },
                },
                required: ["success", "message", "data"],
                example: {
                    success: true,
                    message: "Đăng nhập thành công",
                    data: {
                        accessToken:
                            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEifQ.signature",
                        user: {
                            id: "507f1f77bcf86cd799439011",
                            email: "user@example.com",
                            full_name: "Nguyen Van A",
                            roles: ["CUSTOMER"],
                        },
                    },
                },
            },
            RefreshSuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Refresh token thành công" },
                    data: {
                        type: "object",
                        properties: {
                            accessToken: { type: "string" },
                        },
                        required: ["accessToken"],
                    },
                },
                required: ["success", "message", "data"],
                example: {
                    success: true,
                    message: "Refresh token thành công",
                    data: {
                        accessToken:
                            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEifQ.newAccess",
                    },
                },
            },
            LogoutSuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Đăng xuất thành công" },
                    data: {
                        type: "object",
                        nullable: true,
                        description: "Luôn null — cùng envelope với các response có `data`.",
                        example: null,
                    },
                },
                required: ["success", "message", "data"],
                example: {
                    success: true,
                    message: "Đăng xuất thành công",
                    data: null,
                },
            },
            PaginatedMeta: {
                type: "object",
                properties: {
                    page: { type: "integer", minimum: 1, example: 1 },
                    limit: { type: "integer", minimum: 1, example: 20 },
                    total: { type: "integer", minimum: 0, example: 150 },
                },
                required: ["page", "limit", "total"],
            },
            PaginatedResponse: {
                type: "object",
                description:
                    "Chuẩn dự kiến cho list (chưa gắn path). `data` = mảng item; khi implement, dùng allOf hoặc schema riêng cho từng resource.",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OK" },
                    data: {
                        type: "array",
                        items: { type: "object", description: "Thay bằng $ref tới schema phần tử" },
                        example: [],
                    },
                    meta: { $ref: "#/components/schemas/PaginatedMeta" },
                },
                required: ["success", "message", "data", "meta"],
                example: {
                    success: true,
                    message: "OK",
                    data: [],
                    meta: { page: 1, limit: 20, total: 150 },
                },
            },
            CreateUserAddressInput: {
                type: "object",
                properties: {
                    receiver_name: {
                        type: "string",
                        minLength: 1,
                        description: "Tên người nhận",
                        example: "Nguyen Van A",
                    },
                    phone: {
                        type: "string",
                        pattern: "^(0|\\+84)[0-9]{9}$",
                        description: "Số điện thoại Việt Nam",
                        example: "0912345678",
                    },
                    address_line_1: {
                        type: "string",
                        minLength: 1,
                        description: "Địa chỉ dòng 1",
                        example: "123 Đường Lê Lợi",
                    },
                    address_line_2: {
                        type: "string",
                        description: "Địa chỉ dòng 2 (tùy chọn)",
                        example: "Căn hộ 101",
                    },
                    city: {
                        type: "string",
                        minLength: 1,
                        description: "Thành phố/Tỉnh",
                        example: "Ho Chi Minh",
                    },
                    district: {
                        type: "string",
                        minLength: 1,
                        description: "Quận/Huyện",
                        example: "District 1",
                    },
                    ward: {
                        type: "string",
                        minLength: 1,
                        description: "Phường/Xã",
                        example: "Ward 1",
                    },
                    is_default: {
                        type: "boolean",
                        description: "Địa chỉ mặc định",
                        default: false,
                    },
                },
                required: ["receiver_name", "phone", "address_line_1", "city", "district", "ward"],
                example: {
                    receiver_name: "Nguyen Van A",
                    phone: "0912345678",
                    address_line_1: "123 Đường Lê Lợi",
                    address_line_2: "Căn hộ 101",
                    city: "Ho Chi Minh",
                    district: "District 1",
                    ward: "Ward 1",
                    is_default: false,
                },
            },
            UpdateUserAddressInput: {
                type: "object",
                properties: {
                    receiver_name: { type: "string", minLength: 1 },
                    phone: { type: "string", pattern: "^(0|\\+84)[0-9]{9}$" },
                    address_line_1: { type: "string", minLength: 1 },
                    address_line_2: { type: "string" },
                    city: { type: "string", minLength: 1 },
                    district: { type: "string", minLength: 1 },
                    ward: { type: "string", minLength: 1 },
                    is_default: { type: "boolean" },
                },
                example: {
                    receiver_name: "Nguyen Van B",
                    phone: "0987654321",
                },
            },
            UserAddress: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "MongoDB ObjectId",
                        example: "507f1f77bcf86cd799439011",
                    },
                    user_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "User ID",
                        example: "507f1f77bcf86cd799439012",
                    },
                    receiver_name: { type: "string", example: "Nguyen Van A" },
                    phone: { type: "string", example: "0912345678" },
                    address_line_1: { type: "string", example: "123 Đường Lê Lợi" },
                    address_line_2: { type: "string", example: "Căn hộ 101" },
                    city: { type: "string", example: "Ho Chi Minh" },
                    district: { type: "string", example: "District 1" },
                    ward: { type: "string", example: "Ward 1" },
                    is_default: { type: "boolean", example: false },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: [
                    "id",
                    "user_id",
                    "receiver_name",
                    "phone",
                    "address_line_1",
                    "city",
                    "district",
                    "ward",
                    "is_default",
                    "created_at",
                    "updated_at",
                ],
            },
            UserAddressListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/UserAddress" },
                    },
                },
                required: ["success", "data"],
            },
            CreateUserAddressResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserAddress" },
                },
                required: ["success", "data"],
            },
            UpdateUserAddressResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserAddress" },
                },
                required: ["success", "data"],
            },
            DeleteUserAddressResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserAddress" },
                },
                required: ["success", "data"],
            },
            CreateCategoryInput: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 100,
                        description: "Category name",
                        example: "Electronics",
                    },
                    slug: {
                        type: "string",
                        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                        description: "URL-friendly slug",
                        example: "electronics",
                    },
                    description: {
                        type: "string",
                        maxLength: 500,
                        description: "Category description",
                        example: "Electronic devices and accessories",
                    },
                    parent_id: {
                        type: ["string", "null"],
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Parent category ID (optional)",
                        example: null,
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE"],
                        default: "ACTIVE",
                        description: "Category status",
                    },
                    icon_url: {
                        type: ["string", "null"],
                        format: "uri",
                        description: "Category icon URL",
                    },
                    image_url: {
                        type: ["string", "null"],
                        format: "uri",
                        description: "Category image URL",
                    },
                    display_order: {
                        type: "integer",
                        minimum: 0,
                        default: 0,
                        description: "Display order",
                    },
                },
                required: ["name", "slug"],
            },
            UpdateCategoryInput: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 100,
                    },
                    slug: {
                        type: "string",
                        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                    },
                    description: {
                        type: "string",
                        maxLength: 500,
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE"],
                    },
                    icon_url: {
                        type: ["string", "null"],
                        format: "uri",
                    },
                    image_url: {
                        type: ["string", "null"],
                        format: "uri",
                    },
                    display_order: {
                        type: "integer",
                        minimum: 0,
                    },
                },
            },
            Category: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "MongoDB ObjectId",
                        example: "507f1f77bcf86cd799439011",
                    },
                    name: {
                        type: "string",
                        example: "Electronics",
                    },
                    slug: {
                        type: "string",
                        example: "electronics",
                    },
                    description: {
                        type: "string",
                        example: "Electronic devices and accessories",
                    },
                    parent_id: {
                        type: ["string", "null"],
                        pattern: "^[a-fA-F0-9]{24}$",
                        example: null,
                    },
                    level: {
                        type: "integer",
                        minimum: 0,
                        example: 0,
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE"],
                        example: "ACTIVE",
                    },
                    icon_url: {
                        type: ["string", "null"],
                        format: "uri",
                    },
                    image_url: {
                        type: ["string", "null"],
                        format: "uri",
                    },
                    display_order: {
                        type: "integer",
                        example: 0,
                    },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "name", "slug", "level", "status", "created_at", "updated_at"],
            },
            CategoryTree: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                    },
                    name: { type: "string" },
                    slug: { type: "string" },
                    level: { type: "integer" },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                    children: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CategoryTree" },
                    },
                },
                required: ["id", "name", "slug", "level", "status", "children"],
            },
            BreadcrumbItem: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                    },
                    name: { type: "string" },
                    slug: { type: "string" },
                    level: { type: "integer" },
                },
                required: ["id", "name", "slug", "level"],
            },
            CategoryResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Category" },
                },
                required: ["success", "data"],
            },
            CategoryTreeResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CategoryTree" },
                    },
                },
                required: ["success", "data"],
            },
            CategoriesListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Category" },
                    },
                },
                required: ["success", "data"],
            },
            BreadcrumbResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/BreadcrumbItem" },
                    },
                },
                required: ["success", "data"],
            },
            DeleteCategoryResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: {
                        type: "string",
                        example: "Category deleted successfully",
                    },
                },
                required: ["success", "message"],
            },

            // ✅ PRODUCT SCHEMAS
            CreateProductInput: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                        maxLength: 200,
                        description: "Tên sản phẩm",
                        example: "Khăn giấy ướt",
                    },
                    slug: {
                        type: "string",
                        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                        description: "Slug URL-friendly",
                        example: "khan-giay-uot",
                    },
                    category_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "ID danh mục",
                        example: "507f1f77bcf86cd799439011",
                    },
                    brand: {
                        type: "string",
                        maxLength: 100,
                        description: "Thương hiệu",
                        example: "ABC Brand",
                    },
                    short_description: {
                        type: "string",
                        maxLength: 500,
                        description: "Mô tả ngắn",
                        example: "Khăn giấy ướt chất lượng cao",
                    },
                    description: {
                        type: "string",
                        maxLength: 2000,
                        description: "Mô tả chi tiết",
                        example: "Khăn giấy ướt với công nghệ kháng khuẩn...",
                    },
                    images: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                url: { type: "string", format: "uri" },
                                alt: { type: "string", maxLength: 200 },
                                is_primary: { type: "boolean", default: false },
                                sort_order: { type: "integer", minimum: 0, default: 0 },
                            },
                            required: ["url"],
                        },
                        description: "Danh sách hình ảnh",
                    },
                    search_keywords: {
                        type: "array",
                        items: { type: "string" },
                        maxItems: 10,
                        description: "Từ khóa tìm kiếm",
                        example: ["khăn giấy", "ướt", "kháng khuẩn"],
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE"],
                        default: "ACTIVE",
                        description: "Trạng thái sản phẩm",
                    },
                },
                required: ["name", "category_id"],
            },
            UpdateProductInput: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 2, maxLength: 200 },
                    slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
                    category_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    brand: { type: "string", maxLength: 100 },
                    short_description: { type: "string", maxLength: 500 },
                    description: { type: "string", maxLength: 2000 },
                    images: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                url: { type: "string", format: "uri" },
                                alt: { type: "string", maxLength: 200 },
                                is_primary: { type: "boolean" },
                                sort_order: { type: "integer", minimum: 0 },
                            },
                        },
                    },
                    search_keywords: { type: "array", items: { type: "string" }, maxItems: 10 },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                },
            },
            Product: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    name: { type: "string", example: "Khăn giấy ướt" },
                    slug: { type: "string", example: "khan-giay-uot" },
                    category_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439012" },
                    brand: { type: "string", example: "ABC Brand" },
                    min_price: { type: "number", example: 150000 },
                    max_price: { type: "number", example: 200000 },
                    min_price_per_unit: { type: "number", example: 1500 },
                    max_price_per_unit: { type: "number", example: 2000 },
                    description: { type: "string", example: "Khăn giấy ướt chất lượng cao" },
                    short_description: { type: "string", example: "Khăn giấy ướt với công nghệ kháng khuẩn" },
                    images: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                url: { type: "string", format: "uri" },
                                alt: { type: "string" },
                                is_primary: { type: "boolean" },
                                sort_order: { type: "integer" },
                            },
                        },
                    },
                    search_keywords: { type: "array", items: { type: "string" } },
                    rating_avg: { type: "number", example: 4.5 },
                    rating_count: { type: "integer", example: 100 },
                    sold_count: { type: "integer", example: 500 },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "name", "slug", "category_id", "status", "created_at", "updated_at"],
            },
            ProductListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    name: { type: "string" },
                    slug: { type: "string" },
                    category_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    brand: { type: "string" },
                    min_price: { type: "number" },
                    max_price: { type: "number" },
                    image: { type: "string", format: "uri" },
                    rating_avg: { type: "number" },
                    rating_count: { type: "integer" },
                    sold_count: { type: "integer" },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                    created_at: { type: "string", format: "date-time" },
                },
                required: ["id", "name", "slug", "category_id", "status", "created_at"],
            },
            ProductDetail: {
                allOf: [
                    { $ref: "#/components/schemas/Product" },
                    {
                        type: "object",
                        properties: {
                            variants: {
                                type: "array",
                                items: { $ref: "#/components/schemas/VariantDetail" },
                            },
                        },
                    },
                ],
            },

            // ✅ VARIANT SCHEMAS
            CreateVariantInput: {
                type: "object",
                properties: {
                    size: {
                        type: "string",
                        minLength: 1,
                        maxLength: 50,
                        description: "Kích thước",
                        example: "20x25",
                    },
                    fabric_type: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Loại vải",
                        example: "Vải Không Dệt",
                    },
                    stock: {
                        type: "object",
                        properties: {
                            available: { type: "integer", minimum: 0, default: 0 },
                            reserved: { type: "integer", minimum: 0, default: 0 },
                            sold: { type: "integer", minimum: 0, default: 0 },
                        },
                    },
                    status: {
                        type: "string",
                        enum: ["ACTIVE", "INACTIVE"],
                        default: "ACTIVE",
                    },
                },
                required: ["size", "fabric_type"],
            },
            UpdateVariantInput: {
                type: "object",
                properties: {
                    size: { type: "string", minLength: 1, maxLength: 50 },
                    fabric_type: { type: "string", minLength: 1, maxLength: 100 },
                    stock: {
                        type: "object",
                        properties: {
                            available: { type: "integer", minimum: 0 },
                            reserved: { type: "integer", minimum: 0 },
                            sold: { type: "integer", minimum: 0 },
                        },
                    },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                },
            },
            Variant: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439013" },
                    product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    sku: { type: "string", example: "KGU-20x25-VKD" },
                    size: { type: "string", example: "20x25" },
                    fabric_type: { type: "string", example: "Vải Không Dệt" },
                    min_price: { type: "number", example: 150000 },
                    max_price: { type: "number", example: 200000 },
                    min_price_per_unit: { type: "number", example: 1500 },
                    max_price_per_unit: { type: "number", example: 2000 },
                    stock: {
                        type: "object",
                        properties: {
                            available: { type: "integer", example: 1000 },
                            reserved: { type: "integer", example: 50 },
                            sold: { type: "integer", example: 200 },
                        },
                    },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "product_id", "sku", "size", "fabric_type", "status", "created_at", "updated_at"],
            },
            VariantDetail: {
                allOf: [
                    { $ref: "#/components/schemas/Variant" },
                    {
                        type: "object",
                        properties: {
                            units: {
                                type: "array",
                                items: { $ref: "#/components/schemas/VariantUnit" },
                            },
                        },
                    },
                ],
            },

            // ✅ VARIANT UNIT SCHEMAS
            CreateVariantUnitInput: {
                type: "object",
                properties: {
                    unit_type: {
                        type: "string",
                        enum: ["UNIT", "PACK", "BOX", "CARTON"],
                        default: "PACK",
                        description: "Loại đơn vị",
                    },
                    display_name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Tên hiển thị",
                        example: "Gói 100",
                    },
                    pack_size: {
                        type: "integer",
                        minimum: 1,
                        description: "Số lượng trong gói",
                        example: 100,
                    },
                    price_tiers: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "object",
                            properties: {
                                min_qty: { type: "integer", minimum: 1 },
                                max_qty: { type: "integer", minimum: 1, nullable: true },
                                unit_price: { type: "number", minimum: 0 },
                            },
                            required: ["min_qty", "unit_price"],
                        },
                        description: "Bậc giá",
                    },
                    min_order_qty: { type: "integer", minimum: 1, default: 1 },
                    max_order_qty: { type: "integer", minimum: 1, nullable: true },
                    qty_step: { type: "integer", minimum: 1, default: 1 },
                    is_default: { type: "boolean", default: false },
                    currency: { type: "string", enum: ["VND", "USD", "EUR"], default: "VND" },
                },
                required: ["display_name", "pack_size", "price_tiers"],
            },
            UpdateVariantUnitInput: {
                type: "object",
                properties: {
                    unit_type: { type: "string", enum: ["UNIT", "PACK", "BOX", "CARTON"] },
                    display_name: { type: "string", minLength: 1, maxLength: 100 },
                    price_tiers: {
                        type: "array",
                        minItems: 1,
                        items: {
                            type: "object",
                            properties: {
                                min_qty: { type: "integer", minimum: 1 },
                                max_qty: { type: "integer", minimum: 1, nullable: true },
                                unit_price: { type: "number", minimum: 0 },
                            },
                            required: ["min_qty", "unit_price"],
                        },
                    },
                    min_order_qty: { type: "integer", minimum: 1 },
                    max_order_qty: { type: "integer", minimum: 1, nullable: true },
                    qty_step: { type: "integer", minimum: 1 },
                    is_default: { type: "boolean" },
                    currency: { type: "string", enum: ["VND", "USD", "EUR"] },
                },
            },
            VariantUnit: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439014" },
                    variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439013" },
                    unit_type: { type: "string", enum: ["UNIT", "PACK", "BOX", "CARTON"], example: "PACK" },
                    display_name: { type: "string", example: "Gói 100" },
                    pack_size: { type: "integer", example: 100 },
                    price_tiers: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                min_qty: { type: "integer", example: 1 },
                                max_qty: { type: "integer", nullable: true, example: 10 },
                                unit_price: { type: "number", example: 180000 },
                            },
                        },
                    },
                    min_order_qty: { type: "integer", example: 1 },
                    max_order_qty: { type: "integer", nullable: true, example: 100 },
                    qty_step: { type: "integer", example: 1 },
                    is_default: { type: "boolean", example: true },
                    currency: { type: "string", enum: ["VND", "USD", "EUR"], example: "VND" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "variant_id", "unit_type", "display_name", "pack_size", "price_tiers", "min_order_qty", "qty_step", "is_default", "currency", "created_at", "updated_at"],
            },
            CalculatePriceInput: {
                type: "object",
                properties: {
                    qty_packs: {
                        type: "integer",
                        minimum: 1,
                        description: "Số gói muốn mua",
                        example: 3,
                    },
                },
                required: ["qty_packs"],
            },
            PriceCalculationResult: {
                type: "object",
                properties: {
                    qty_packs: { type: "integer", example: 3 },
                    unit_price: { type: "number", example: 180000 },
                    total_price: { type: "number", example: 540000 },
                    total_items: { type: "integer", example: 300 },
                    price_per_unit: { type: "number", example: 1800 },
                    currency: { type: "string", example: "VND" },
                    pack_size: { type: "integer", example: 100 },
                    unit_display: { type: "string", example: "Gói 100" },
                },
                required: ["qty_packs", "unit_price", "total_price", "total_items", "price_per_unit", "currency", "pack_size", "unit_display"],
            },
            ReserveStockInput: {
                type: "object",
                properties: {
                    qty_items: {
                        type: "integer",
                        minimum: 1,
                        description: "Số lượng sản phẩm (cái)",
                        example: 300,
                    },
                },
                required: ["qty_items"],
            },

            // ✅ RESPONSE SCHEMAS
            ProductResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Product" },
                },
                required: ["success", "data"],
            },
            ProductDetailResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/ProductDetail" },
                },
                required: ["success", "data"],
            },
            ProductsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProductListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            current_page: { type: "integer", example: 1 },
                            total_pages: { type: "integer", example: 5 },
                            total_items: { type: "integer", example: 100 },
                            per_page: { type: "integer", example: 20 },
                        },
                        required: ["current_page", "total_pages", "total_items", "per_page"],
                    },
                },
                required: ["success", "data", "pagination"],
            },
            VariantResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Variant" },
                },
                required: ["success", "data"],
            },
            VariantsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Variant" },
                    },
                },
                required: ["success", "data"],
            },
            VariantUnitResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/VariantUnit" },
                },
                required: ["success", "data"],
            },
            VariantUnitsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/VariantUnit" },
                    },
                },
                required: ["success", "data"],
            },
            CalculatePriceResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/PriceCalculationResult" },
                },
                required: ["success", "data"],
            },
            StockResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                            sku: { type: "string" },
                            stock: { $ref: "#/components/schemas/Variant" },
                        },
                    },
                },
                required: ["success", "data"],
            },
            DeleteResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Deleted successfully" },
                },
                required: ["success", "message"],
            },

            // ✅ CART SCHEMAS
            CartItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439015" },
                    product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439010" },
                    variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    unit_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439012" },
                    sku: { type: "string", example: "BAG-20X25-POLYESTER" },
                    variant_label: { type: "string", example: "20x25 - Vải Không Dệt" },
                    product_name: { type: "string", example: "Túi Bao Trái" },
                    product_image: { type: "string", format: "uri", nullable: true },
                    display_name: { type: "string", example: "Gói 100" },
                    pack_size: { type: "integer", example: 100 },
                    price_at_added: { type: "number", example: 180000 },
                    quantity: { type: "integer", example: 5 },
                    line_total: { type: "number", example: 900000 },
                    added_at: { type: "string", format: "date-time" },
                },
                required: ["id", "product_id", "variant_id", "unit_id", "sku", "quantity", "price_at_added", "line_total"],
            },
            CartDiscount: {
                type: "object",
                properties: {
                    code: { type: "string", example: "SALE10" },
                    type: { type: "string", enum: ["PERCENT", "FIXED"], example: "PERCENT" },
                    value: { type: "number", example: 10 },
                    discount_amount: { type: "number", example: 90000 },
                    min_purchase: { type: "number", example: 500000, nullable: true },
                    max_discount: { type: "number", example: 100000, nullable: true },
                    apply_scope: { type: "string", enum: ["CART", "PRODUCT"], example: "CART" },
                    applied_at: { type: "string", format: "date-time" },
                    expires_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["code", "type", "value", "discount_amount", "applied_at"],
            },
            CartTotals: {
                type: "object",
                properties: {
                    subtotal: { type: "number", example: 900000 },
                    discount_amount: { type: "number", example: 90000 },
                    total: { type: "number", example: 810000 },
                    item_count: { type: "integer", example: 1 },
                    items_total_units: { type: "integer", example: 500 },
                },
                required: ["subtotal", "discount_amount", "total", "item_count", "items_total_units"],
            },
            Cart: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439016" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true, example: "507f1f77bcf86cd799439013" },
                    session_key: { type: "string", format: "uuid", nullable: true },
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CartItem" },
                    },
                    discount: {
                        allOf: [{ $ref: "#/components/schemas/CartDiscount" }],
                        nullable: true,
                    },
                    totals: { $ref: "#/components/schemas/CartTotals" },
                    status: { type: "string", enum: ["ACTIVE", "ABANDONED", "CHECKED_OUT"], example: "ACTIVE" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "items", "totals", "status", "created_at", "updated_at"],
            },
            CartSummary: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    item_count: { type: "integer", example: 1 },
                    items_total_units: { type: "integer", example: 500 },
                    subtotal: { type: "number", example: 900000 },
                    discount_amount: { type: "number", example: 90000 },
                    total: { type: "number", example: 810000 },
                    status: { type: "string", enum: ["ACTIVE", "ABANDONED", "CHECKED_OUT"] },
                },
                required: ["id", "item_count", "total"],
            },
            AddToCartInput: {
                type: "object",
                properties: {
                    product_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Product ID",
                        example: "507f1f77bcf86cd799439010",
                    },
                    variant_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Variant ID",
                        example: "507f1f77bcf86cd799439011",
                    },
                    unit_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Unit ID",
                        example: "507f1f77bcf86cd799439012",
                    },
                    sku: {
                        type: "string",
                        minLength: 3,
                        maxLength: 50,
                        pattern: "^[A-Z0-9\\-]+$",
                        example: "BAG-20X25-POLYESTER",
                    },
                    variant_label: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        example: "20x25 - Vải Không Dệt",
                    },
                    product_name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 200,
                        example: "Túi Bao Trái",
                    },
                    product_image: {
                        type: "string",
                        format: "uri",
                        nullable: true,
                    },
                    display_name: {
                        type: "string",
                        minLength: 1,
                        maxLength: 50,
                        example: "Gói 100",
                    },
                    pack_size: {
                        type: "integer",
                        minimum: 1,
                        maximum: 10000,
                        example: 100,
                    },
                    price_at_added: {
                        type: "number",
                        minimum: 0,
                        maximum: 999999999,
                        example: 180000,
                    },
                    quantity: {
                        type: "integer",
                        minimum: 1,
                        maximum: 999,
                        example: 5,
                    },
                },
                required: ["product_id", "variant_id", "unit_id", "sku", "variant_label", "product_name", "display_name", "pack_size", "price_at_added", "quantity"],
            },
            UpdateCartItemInput: {
                type: "object",
                properties: {
                    quantity: {
                        type: "integer",
                        minimum: 1,
                        maximum: 999,
                        example: 10,
                    },
                },
                required: ["quantity"],
            },
            ApplyDiscountInput: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        minLength: 3,
                        maxLength: 20,
                        pattern: "^[A-Z0-9\\-]+$",
                        example: "SALE10",
                    },
                },
                required: ["code"],
            },
            MergeCartInput: {
                type: "object",
                properties: {
                    session_key: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                },
                required: ["session_key"],
            },
            CreateGuestCartInput: {
                type: "object",
                properties: {
                    session_key: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000",
                    },
                },
                required: ["session_key"],
            },
            CheckoutSnapshot: {
                type: "object",
                properties: {
                    source_cart_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    cart_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                unit_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                sku: { type: "string" },
                                variant_label: { type: "string" },
                                product_name: { type: "string" },
                                product_image: { type: "string", format: "uri", nullable: true },
                                display_name: { type: "string" },
                                pack_size: { type: "integer" },
                                quantity: { type: "integer" },
                                total_items: { type: "integer" },
                                price_at_added: { type: "number" },
                                line_total: { type: "number" },
                                price_per_item: { type: "number" },
                            },
                        },
                    },
                    discount: {
                        allOf: [{ $ref: "#/components/schemas/CartDiscount" }],
                        nullable: true,
                    },
                    totals: { $ref: "#/components/schemas/CartTotals" },
                    snapshot_at: { type: "string", format: "date-time" },
                },
                required: ["source_cart_id", "items", "totals", "snapshot_at"],
            },
            CartValidation: {
                type: "object",
                properties: {
                    isValid: { type: "boolean", example: true },
                    errors: {
                        type: "array",
                        items: { type: "string" },
                        example: [],
                    },
                    totals: { $ref: "#/components/schemas/CartTotals" },
                },
                required: ["isValid", "errors", "totals"],
            },
            AbandonedCart: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                    session_key: { type: "string", format: "uuid", nullable: true },
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CartItem" },
                    },
                    discount: {
                        allOf: [{ $ref: "#/components/schemas/CartDiscount" }],
                        nullable: true,
                    },
                    totals: { $ref: "#/components/schemas/CartTotals" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    expired_at: { type: "string", format: "date-time", nullable: true },
                    abandoned_since: { type: "string", example: "2 days ago" },
                    status: { type: "string", enum: ["ACTIVE", "ABANDONED", "CHECKED_OUT"] },
                },
                required: ["id", "items", "totals", "status"],
            },

            // ✅ RESPONSE SCHEMAS
            CartResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        allOf: [{ $ref: "#/components/schemas/Cart" }],
                    },
                },
                required: ["success", "data"],
            },
            CartListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AbandonedCart" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            total: { type: "integer", example: 50 },
                            limit: { type: "integer", example: 100 },
                        },
                        required: ["total", "limit"],
                    },
                },
                required: ["success", "data", "pagination"],
            },
            CheckoutResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        allOf: [{ $ref: "#/components/schemas/CheckoutSnapshot" }],
                    },
                    message: { type: "string", example: "Cart validated for checkout" },
                },
                required: ["success", "data", "message"],
            },
            ValidateResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/CartValidation" },
                },
                required: ["success", "data"],
            },
            AbandonedResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/AbandonedCart" },
                    message: { type: "string", example: "Cart marked as abandoned" },
                },
                required: ["success", "data", "message"],
            },

            // ✅ ORDER SCHEMAS
            OrderAddressSnapshot: {
                type: "object",
                properties: {
                    street: { type: "string", example: "123 Đường Lê Lợi" },
                    district: { type: "string", example: "Quận 1" },
                    city: { type: "string", example: "TP. Hồ Chí Minh" },
                    postal_code: { type: "string", example: "700000", nullable: true },
                    country: { type: "string", default: "Vietnam", example: "Vietnam" },
                    phone: { type: "string", example: "0912345678" },
                    recipient_name: { type: "string", example: "Nguyễn Văn A" },
                },
                required: ["street", "district", "city", "phone", "recipient_name"],
            },

            OrderItemSnapshot: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    unit_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },

                    product_name: { type: "string", example: "Túi Bao Trái" },
                    product_image: { type: "string", format: "uri", nullable: true },
                    variant_label: { type: "string", example: "20x25 - Vải Không Dệt" },
                    sku: { type: "string", example: "BAG-20X25-POLYESTER" },
                    unit_label: { type: "string", example: "Gói 100" },
                    pack_size: { type: "integer", example: 100 },

                    quantity_ordered: { type: "integer", example: 10 },
                    quantity_fulfilled: { type: "integer", example: 10 },

                    unit_price: { type: "number", example: 180000 },
                    line_total: { type: "number", example: 1800000 },

                    review_status: { type: "string", enum: ["pending", "reviewed"], example: "pending" },
                },
                required: ["id", "product_id", "variant_id", "unit_id", "product_name", "sku", "quantity_ordered", "unit_price", "line_total"],
            },

            OrderPricing: {
                type: "object",
                properties: {
                    subtotal: { type: "number", example: 1800000 },
                    shipping_fee: { type: "number", example: 0 },
                    discount_amount: { type: "number", example: 180000 },
                    total_amount: { type: "number", example: 1620000 },
                    currency: { type: "string", enum: ["VND", "USD", "EUR"], default: "VND" },
                },
                required: ["subtotal", "shipping_fee", "discount_amount", "total_amount", "currency"],
            },

            OrderDiscount: {
                type: "object",
                properties: {
                    code: { type: "string", example: "SALE10" },
                    type: { type: "string", enum: ["percentage", "fixed"], example: "percentage" },
                    value: { type: "number", example: 10 },
                    scope: { type: "string", enum: ["ORDER", "ITEM"], default: "ORDER" },
                    applied_amount: { type: "number", example: 180000 },
                },
                required: ["type", "value", "scope", "applied_amount"],
            },

            OrderPayment: {
                type: "object",
                properties: {
                    method: { type: "string", enum: ["COD", "VNPAY", "MOMO", "CARD"], example: "COD" },
                    status: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], example: "PENDING" },
                    paid_at: { type: "string", format: "date-time", nullable: true },
                    refunded_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["method", "status"],
            },

            OrderShipment: {
                type: "object",
                properties: {
                    carrier: { type: "string", example: "GHN" },
                    tracking_code: { type: "string", example: "100123456789" },
                    shipped_at: { type: "string", format: "date-time", nullable: true },
                    delivered_at: { type: "string", format: "date-time", nullable: true },
                },
            },

            OrderStatusHistoryRecord: {
                type: "object",
                properties: {
                    from: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"], nullable: true },
                    to: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"] },
                    from_label: { type: "string", example: "Đang chờ thanh toán" },
                    to_label: { type: "string", example: "Đã thanh toán" },
                    changed_at: { type: "string", format: "date-time" },
                    changed_at_formatted: { type: "string", example: "15/04/2024 10:30:00" },
                    changed_by_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                    note: { type: "string", nullable: true },
                    is_system: { type: "boolean", example: false },
                },
                required: ["to", "changed_at"],
            },

            OrderFulfillment: {
                type: "object",
                properties: {
                    total_ordered: { type: "integer", example: 1000 },
                    total_fulfilled: { type: "integer", example: 1000 },
                    pending_items: { type: "integer", example: 0 },
                },
                required: ["total_ordered", "total_fulfilled", "pending_items"],
            },

            Order: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439020" },
                    order_code: { type: "string", example: "ORD-20240415-ABC12", pattern: "^ORD-[0-9]{8}-[A-Z0-9]{5}$" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },

                    address_snapshot: { $ref: "#/components/schemas/OrderAddressSnapshot" },
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderItemSnapshot" },
                    },

                    pricing: { $ref: "#/components/schemas/OrderPricing" },
                    discount: {
                        allOf: [{ $ref: "#/components/schemas/OrderDiscount" }],
                        nullable: true,
                    },

                    payment: { $ref: "#/components/schemas/OrderPayment" },
                    shipment: {
                        allOf: [{ $ref: "#/components/schemas/OrderShipment" }],
                        nullable: true,
                    },

                    status: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"], example: "PENDING" },
                    status_history: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderStatusHistoryRecord" },
                    },

                    customer_notes: { type: "string", nullable: true, example: "Giao buổi sáng nếu được" },

                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "order_code", "user_id", "address_snapshot", "items", "pricing", "payment", "status", "created_at", "updated_at"],
            },

            OrderDetail: {
                allOf: [
                    { $ref: "#/components/schemas/Order" },
                    {
                        type: "object",
                        properties: {
                            fulfillment: { $ref: "#/components/schemas/OrderFulfillment" },
                            payment_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                            shipment_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                            payment_expires_at: { type: "string", format: "date-time", nullable: true },
                        },
                    },
                ],
            },

            OrderListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    order_code: { type: "string", example: "ORD-20240415-ABC12" },
                    item_count: { type: "integer", example: 5 },
                    total_items: { type: "integer", example: 500 },
                    total_amount: { type: "number", example: 1620000 },
                    status: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"] },
                    payment_status: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"] },
                    created_at: { type: "string", format: "date-time" },
                    delivered_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "order_code", "item_count", "total_amount", "status", "created_at"],
            },

            OrderTracking: {
                type: "object",
                properties: {
                    order_code: { type: "string", example: "ORD-20240415-ABC12" },
                    status: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"] },
                    status_label: { type: "string", example: "Đã giao" },
                    timeline: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                status: { type: "string" },
                                status_label: { type: "string" },
                                timestamp: { type: "string", format: "date-time" },
                                timestamp_formatted: { type: "string" },
                                completed: { type: "boolean" },
                            },
                        },
                    },
                    shipment: {
                        allOf: [{ $ref: "#/components/schemas/OrderShipment" }],
                        nullable: true,
                    },
                    estimated_delivery: { type: "string", example: "20/04/2024" },
                },
                required: ["order_code", "status", "status_label", "timeline"],
            },

            OrderStats: {
                type: "object",
                properties: {
                    totalOrders: { type: "integer", example: 1250 },
                    totalRevenue: { type: "number", example: 2500000000 },
                    statusBreakdown: {
                        type: "object",
                        properties: {
                            PENDING: { type: "integer", example: 12 },
                            PAID: { type: "integer", example: 150 },
                            PROCESSING: { type: "integer", example: 45 },
                            SHIPPED: { type: "integer", example: 120 },
                            DELIVERED: { type: "integer", example: 920 },
                            FAILED: { type: "integer", example: 3 },
                        },
                    },
                    paymentBreakdown: {
                        type: "object",
                        properties: {
                            PENDING: { type: "integer", example: 12 },
                            PAID: { type: "integer", example: 1230 },
                            FAILED: { type: "integer", example: 8 },
                        },
                    },
                },
                required: ["totalOrders", "totalRevenue", "statusBreakdown", "paymentBreakdown"],
            },

            // ✅ REQUEST SCHEMAS
            CreateOrderInput: {
                type: "object",
                properties: {
                    cart_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "ID của giỏ hàng cần checkout",
                        example: "507f1f77bcf86cd799439016",
                    },
                    address_snapshot: {
                        $ref: "#/components/schemas/OrderAddressSnapshot",
                        allOf: [
                            { $ref: "#/components/schemas/OrderAddressSnapshot" }
                        ]
                    },
                    payment_method: {
                        type: "string",
                        enum: ["COD", "VNPAY", "MOMO", "CARD"],
                        description: "Phương thức thanh toán",
                        example: "COD",
                    },
                    customer_notes: {
                        type: "string",
                        maxLength: 500,
                        description: "Ghi chú từ khách",
                        example: "Giao buổi sáng nếu được",
                    },
                    shipping_fee: {
                        type: "number",
                        minimum: 0,
                        default: 0,
                        description: "Phí vận chuyển",
                    },
                    currency: {
                        type: "string",
                        enum: ["VND", "USD", "EUR"],
                        default: "VND",
                        description: "Tiền tệ",
                    },
                },
                required: ["cart_id", "address_snapshot", "payment_method"],
            },

            UpdateOrderStatusInput: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"],
                        description: "Trạng thái mới",
                        example: "PROCESSING",
                    },
                    note: {
                        type: "string",
                        maxLength: 500,
                        description: "Ghi chú",
                        example: "Sent to warehouse for fulfillment",
                    },
                },
                required: ["status"],
            },

            AdminUpdateOrderInput: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "FAILED", "CANCELED"],
                        description: "Trạng thái mới (tùy chọn)",
                    },
                    admin_notes: {
                        type: "string",
                        maxLength: 1000,
                        description: "Ghi chú admin (tùy chọn)",
                        example: "Customer requested priority shipping",
                    },
                },
            },

            FulfillItemInput: {
                type: "object",
                properties: {
                    item_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "ID của item trong order",
                        example: "507f1f77bcf86cd799439021",
                    },
                    quantity_fulfilled: {
                        type: "integer",
                        minimum: 1,
                        maximum: 1000000,
                        description: "Số gói cần đánh dấu là fulfilled",
                        example: 10,
                    },
                },
                required: ["item_id", "quantity_fulfilled"],
            },

            RecordShipmentInput: {
                type: "object",
                properties: {
                    carrier: {
                        type: "string",
                        minLength: 1,
                        maxLength: 50,
                        description: "Tên công ty vận chuyển",
                        example: "GHN",
                    },
                    tracking_code: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                        description: "Mã tracking từ công ty vận chuyển",
                        example: "100123456789",
                    },
                },
                required: ["carrier", "tracking_code"],
            },

            CancelOrderInput: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        minLength: 1,
                        maxLength: 500,
                        description: "Lý do hủy đơn",
                        example: "Mình đặt nhầm size",
                    },
                },
                required: ["reason"],
            },

            WriteReviewInput: {
                type: "object",
                properties: {
                    item_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "ID của item cần review",
                        example: "507f1f77bcf86cd799439021",
                    },
                    rating: {
                        type: "integer",
                        minimum: 1,
                        maximum: 5,
                        description: "Đánh giá sao (1-5)",
                        example: 5,
                    },
                    comment: {
                        type: "string",
                        maxLength: 500,
                        description: "Bình luận (tùy chọn)",
                        example: "Sản phẩm chất lượng, giao hàng nhanh",
                    },
                },
                required: ["item_id", "rating"],
            },

            // ✅ RESPONSE SCHEMAS
            OrderResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: {
                        allOf: [
                            { $ref: "#/components/schemas/Order" }
                        ]
                    }
                },
                required: ["success", "data"]
            },

            OrderDetailResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: {
                        allOf: [
                            { $ref: "#/components/schemas/Order" },
                            {
                                type: "object",
                                properties: {
                                    items: {
                                        type: "array",
                                        items: {
                                            $ref: "#/components/schemas/OrderItemSnapshot"
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },

            OrdersListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/OrderListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", minimum: 1, example: 1 },
                            limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                            total: { type: "integer", example: 45 },
                            totalPages: { type: "integer", example: 3 },
                        },
                        required: ["page", "limit", "total", "totalPages"],
                    },
                },
                required: ["success", "data", "pagination"],
            },

            OrderTrackingResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/OrderTracking" },
                },
                required: ["success", "data"],
            },

            OrderStatsResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/OrderStats" },
                },
                required: ["success", "data"],
            },

            // ✅ PAYMENT SCHEMAS
            Payment: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        example: "507f1f77bcf86cd799439030",
                        description: "Payment ID",
                    },
                    order_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        example: "507f1f77bcf86cd799439020",
                        description: "Order ID",
                    },
                    user_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        example: "507f1f77bcf86cd799439013",
                        description: "User ID",
                    },
                    provider: {
                        type: "string",
                        enum: ["vnpay", "stripe", "paypal"],
                        example: "vnpay",
                        description: "Payment provider",
                    },
                    amount: {
                        type: "integer",
                        example: 1620000,
                        description: "Payment amount (integer only, VND in đồng, USD in cents)",
                    },
                    currency: {
                        type: "string",
                        enum: ["VND", "USD"],
                        default: "VND",
                        example: "VND",
                    },
                    status: {
                        type: "string",
                        enum: ["pending", "paid", "failed"],
                        example: "pending",
                        description: "Payment status (state machine: pending → paid/failed ONLY)",
                    },
                    verification_status: {
                        type: "string",
                        enum: ["pending", "verified", "failed"],
                        example: "pending",
                        description: "Webhook signature verification status",
                    },
                    transaction_ref: {
                        type: "string",
                        example: "20240415123456789",
                        nullable: true,
                        description: "VNPay txn_ref, Stripe PI ID, or PayPal order ID",
                    },
                    failure_reason: {
                        type: "string",
                        nullable: true,
                        example: "PAYMENT_REJECTED",
                        description: "Failure reason (if status=failed)",
                    },
                    failure_message: {
                        type: "string",
                        nullable: true,
                        example: "Card declined by bank",
                        description: "User-facing failure message",
                    },
                    paid_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                        example: "2024-04-15T10:30:00Z",
                    },
                    expires_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                        example: "2024-04-15T10:45:00Z",
                        description: "Payment window expiration (pending only, TTL field)",
                    },
                    created_at: {
                        type: "string",
                        format: "date-time",
                        example: "2024-04-15T10:15:00Z",
                    },
                    updated_at: {
                        type: "string",
                        format: "date-time",
                        example: "2024-04-15T10:30:00Z",
                    },
                },
                required: ["id", "order_id", "user_id", "provider", "amount", "currency", "status", "verification_status", "created_at", "updated_at"],
            },

            PaymentDetail: {
                allOf: [
                    { $ref: "#/components/schemas/Payment" },
                    {
                        type: "object",
                        properties: {
                            status_label: { type: "string", example: "Pending" },
                            verification_status_label: { type: "string", example: "Awaiting verification" },
                            provider_data: {
                                type: "object",
                                nullable: true,
                                description: "Provider-specific data (filtered for security)",
                                properties: {
                                    vnp_txn_ref: { type: "string", nullable: true },
                                    vnp_bank_code: { type: "string", nullable: true, example: "VCB" },
                                    vnp_pay_date: { type: "string", format: "date-time", nullable: true },
                                    stripe_pi_id: { type: "string", nullable: true },
                                    stripe_status: { type: "string", nullable: true },
                                    paypal_order_id: { type: "string", nullable: true },
                                },
                            },
                            can_retry: { type: "boolean", example: false, description: "Can customer retry payment" },
                            can_cancel: { type: "boolean", example: true, description: "Can customer cancel payment" },
                            retry_count: { type: "integer", example: 0 },
                            last_retry_at: { type: "string", format: "date-time", nullable: true },
                        },
                    },
                ],
            },

            CreatePaymentInput: {
                type: "object",
                properties: {
                    order_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Order ID (amount locked to order.total_amount)",
                        example: "507f1f77bcf86cd799439020",
                    },
                    provider: {
                        type: "string",
                        enum: ["vnpay", "stripe", "paypal"],
                        default: "vnpay",
                        description: "Payment provider (default: vnpay)",
                    },
                },
                required: ["order_id"],
            },

            CreatePaymentResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            paymentId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                            payment: { $ref: "#/components/schemas/Payment" },
                            paymentUrl: { type: "string", format: "uri", example: "https://sandbox.vnpayment.vn/paygate?..." },
                        },
                        required: ["paymentId", "payment", "paymentUrl"],
                    },
                },
                required: ["success", "data"],
            },

            PaymentListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    order_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    provider: { type: "string", enum: ["vnpay", "stripe", "paypal"] },
                    transaction_ref: { type: "string", nullable: true },
                    amount: { type: "integer" },
                    currency: { type: "string", enum: ["VND", "USD"] },
                    status: { type: "string", enum: ["pending", "paid", "failed"] },
                    verification_status: { type: "string", enum: ["pending", "verified", "failed"] },
                    created_at: { type: "string", format: "date-time" },
                    paid_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "order_id", "user_id", "provider", "amount", "currency", "status", "verification_status", "created_at"],
            },

            PaymentsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PaymentListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", minimum: 1, example: 1 },
                            limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
                            total: { type: "integer", example: 45 },
                            totalPages: { type: "integer", example: 3 },
                        },
                        required: ["page", "limit", "total", "totalPages"],
                    },
                },
                required: ["success", "data", "pagination"],
            },

            PaymentResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/PaymentDetail" },
                },
                required: ["success", "data"],
            },

            RetryPaymentResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            paymentId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                            payment: { $ref: "#/components/schemas/Payment" },
                            paymentUrl: { type: "string", format: "uri" },
                        },
                        required: ["paymentId", "payment", "paymentUrl"],
                    },
                },
                required: ["success", "data"],
            },

            CancelPaymentInput: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        maxLength: 500,
                        description: "Cancellation reason",
                        example: "Changed my mind about this order",
                    },
                },
            },

            CancelPaymentResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            status: { type: "string", example: "failed" },
                            reason: { type: "string", example: "CANCELLED_BY_USER" },
                            message: { type: "string", example: "User cancelled" },
                        },
                    },
                },
                required: ["success", "data"],
            },

            VNPayWebhookInput: {
                type: "object",
                properties: {
                    vnp_Amount: { type: "integer", example: 1620000 },
                    vnp_BankCode: { type: "string", example: "VCB" },
                    vnp_BankTranNo: { type: "string", nullable: true },
                    vnp_CardType: { type: "string", enum: ["DEBIT", "CREDIT"], nullable: true },
                    vnp_OrderInfo: { type: "string", nullable: true },
                    vnp_PayDate: { type: "string", pattern: "^\\d{14}$", example: "20240415101500" },
                    vnp_ResponseCode: { type: "string", pattern: "^\\d{2}$", example: "00" },
                    vnp_TmnCode: { type: "string", example: "2QXYZ" },
                    vnp_TransactionNo: { type: "string", example: "14235820" },
                    vnp_TxnRef: { type: "string", example: "ORD-20240415-ABC12" },
                    vnp_SecureHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
                    vnp_SecureHashType: { type: "string", default: "SHA256" },
                },
                required: ["vnp_Amount", "vnp_PayDate", "vnp_ResponseCode", "vnp_TmnCode", "vnp_TransactionNo", "vnp_TxnRef", "vnp_SecureHash"],
            },

            WebhookResponseData: {
                type: "object",
                properties: {
                    status: { type: "string", example: "paid" },
                    transactionRef: { type: "string", example: "20240415123456789" },
                    orderId: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                    message: { type: "string", example: "Payment processed successfully" },
                },
            },

            WebhookResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            status: { type: "string", example: "paid" },
                            transactionRef: { type: "string", example: "20240415123456789" },
                            orderId: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                            message: { type: "string", example: "Payment processed successfully" },
                        },
                        required: ["status"]
                    },
                },
                required: ["success", "data"],
            },

            PaymentStatsResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            totalPayments: { type: "integer", example: 1250 },
                            totalRevenue: { type: "integer", example: 2500000000 },
                            statusBreakdown: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", enum: ["pending", "paid", "failed"] },
                                        count: { type: "integer" },
                                        revenue: { type: "integer" },
                                    },
                                },
                            },
                            providerBreakdown: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        provider: { type: "string", enum: ["vnpay", "stripe", "paypal"] },
                                        count: { type: "integer" },
                                        revenue: { type: "integer" },
                                    },
                                },
                            },
                            failedVerifications: { type: "integer", example: 5 },
                        },
                    },
                },
                required: ["success", "data"],
            },

            // ===== DISCOUNT SCHEMAS =====
            CreateDiscountInput: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        minLength: 3,
                        maxLength: 20,
                        uppercase: true,
                        pattern: "^[A-Z0-9_-]+$",
                        description: "Mã discount (chữ hoa, ký tự đặc biệt: _ -)",
                        example: "SALE50",
                    },
                    type: {
                        type: "string",
                        enum: ["percent", "fixed"],
                        description: "Loại discount",
                        example: "percent",
                    },
                    value: {
                        type: "number",
                        minimum: 0,
                        description: "Giá trị (percent: 50 = 50%, fixed: 200000 = 200k VND)",
                        example: 50,
                    },
                    max_discount_amount: {
                        type: "number",
                        minimum: 0,
                        description: "MANDATORY cho percent: giới hạn tối đa VND",
                        example: 500000,
                    },
                    application_strategy: {
                        type: "string",
                        enum: ["apply_all", "apply_once", "apply_cheapest", "apply_most_expensive"],
                        default: "apply_all",
                        description: "Cách áp dụng khi có nhiều items khớp",
                    },
                    applicable_targets: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["all", "specific_products", "specific_categories", "specific_variants"],
                                default: "all",
                            },
                            product_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            category_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            variant_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                        },
                    },
                    user_eligibility: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["all", "first_time_only", "specific_users", "vip_users"],
                                default: "all",
                            },
                            user_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            min_user_tier: {
                                type: "string",
                                enum: ["bronze", "silver", "gold", "platinum"],
                            },
                        },
                    },
                    min_order_value: {
                        type: "number",
                        default: 0,
                        description: "Giá trị đơn hàng tối thiểu để áp dụng",
                        example: 500000,
                    },
                    usage_limit: {
                        type: "integer",
                        minimum: 1,
                        description: "Tổng số lần có thể sử dụng",
                        example: 1000,
                    },
                    usage_per_user_limit: {
                        type: "integer",
                        minimum: 1,
                        description: "Số lần tối đa mỗi user có thể sử dụng",
                        example: 2,
                    },
                    is_stackable: {
                        type: "boolean",
                        default: false,
                        description: "Có thể kết hợp với discount khác không",
                    },
                    stack_priority: {
                        type: "integer",
                        default: 0,
                        description: "Độ ưu tiên khi stack (cao hơn = áp dụng trước)",
                    },
                    started_at: {
                        type: "string",
                        format: "date-time",
                        description: "Ngày bắt đầu có hiệu lực",
                        example: "2026-04-01T00:00:00Z",
                    },
                    expiry_date: {
                        type: "string",
                        format: "date-time",
                        description: "Ngày hết hạn",
                        example: "2026-04-30T23:59:59Z",
                    },
                    status: {
                        type: "string",
                        enum: ["active", "inactive", "paused", "expired"],
                        default: "active",
                    },
                },
                required: ["code", "type", "value", "usage_limit", "usage_per_user_limit", "started_at", "expiry_date"],
            },

            UpdateDiscountInput: {
                type: "object",
                properties: {
                    code: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Z0-9_-]+$" },
                    type: { type: "string", enum: ["percent", "fixed"] },
                    value: { type: "number", minimum: 0 },
                    max_discount_amount: { type: "number", minimum: 0 },
                    application_strategy: {
                        type: "string",
                        enum: ["apply_all", "apply_once", "apply_cheapest", "apply_most_expensive"],
                    },
                    applicable_targets: {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["all", "specific_products", "specific_categories", "specific_variants"] },
                            product_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            category_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            variant_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                        },
                    },
                    user_eligibility: {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["all", "first_time_only", "specific_users", "vip_users"] },
                            user_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                            min_user_tier: { type: "string", enum: ["bronze", "silver", "gold", "platinum"] },
                        },
                    },
                    min_order_value: { type: "number" },
                    usage_limit: { type: "integer", minimum: 1 },
                    usage_per_user_limit: { type: "integer", minimum: 1 },
                    is_stackable: { type: "boolean" },
                    stack_priority: { type: "integer" },
                    started_at: { type: "string", format: "date-time" },
                    expiry_date: { type: "string", format: "date-time" },
                    status: { type: "string", enum: ["active", "inactive", "paused", "expired"] },
                },
            },

            ValidateDiscountInput: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        minLength: 1,
                        maxLength: 20,
                        description: "Mã discount (sẽ auto uppercase + trim)",
                        example: "SALE50",
                    },
                    cartSubtotal: {
                        type: "number",
                        minimum: 0,
                        description: "Tổng tiền giỏ hàng trước discount",
                        example: 10000000,
                    },
                    cartItems: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                _id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                unit_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                category_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                sku: { type: "string" },
                                quantity: { type: "integer", minimum: 1 },
                                line_total: { type: "number", minimum: 0 },
                            },
                        },
                        description: "Danh sách items trong cart (để filter applicable items)",
                    },
                },
                required: ["code", "cartSubtotal"],
            },

            BulkCreateDiscountInput: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    properties: {
                        code: { type: "string", minLength: 3, maxLength: 20, pattern: "^[A-Z0-9_-]+$" },
                        type: { type: "string", enum: ["percent", "fixed"] },
                        value: { type: "number", minimum: 0 },
                        max_discount_amount: { type: "number", minimum: 0 },
                        usage_limit: { type: "integer", minimum: 1 },
                        usage_per_user_limit: { type: "integer", minimum: 1 },
                        started_at: { type: "string", format: "date-time" },
                        expiry_date: { type: "string", format: "date-time" },
                        status: { type: "string", enum: ["active", "inactive", "paused", "expired"] },
                    },
                    required: ["code", "type", "value", "usage_limit", "usage_per_user_limit"],
                },
                example: [
                    {
                        code: "SALE001",
                        type: "percent",
                        value: 10,
                        max_discount_amount: 100000,
                        usage_limit: 100,
                        usage_per_user_limit: 1,
                    },
                ],
            },

            Discount: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    code: {
                        type: "string",
                        example: "SALE50",
                        minLength: 3,
                        maxLength: 20,
                        pattern: "^[A-Z0-9_-]+$"
                    },
                    type: { type: "string", enum: ["percent", "fixed"], example: "percent" },
                    value: {
                        type: "number",
                        minimum: 0,  // ← ADD THIS LINE
                        example: 50
                    },
                    max_discount_amount: {
                        type: "number",
                        minimum: 0,
                        example: 500000
                    },
                    application_strategy: {
                        type: "string",
                        enum: ["apply_all", "apply_once", "apply_cheapest", "apply_most_expensive"],
                        example: "apply_all"
                    },
                    applicable_targets: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["all", "specific_products", "specific_categories", "specific_variants"],
                                example: "all"
                            },
                            type_label: { type: "string", example: "All Products" },
                            product_ids: { type: "array", items: { type: "string" }, default: [] },
                            category_ids: { type: "array", items: { type: "string" }, default: [] },
                            variant_ids: { type: "array", items: { type: "string" }, default: [] },
                        },
                    },
                    user_eligibility: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["all", "first_time_only", "specific_users", "vip_users"],
                                example: "all"
                            },
                            type_label: { type: "string", example: "All Users" },
                            user_ids: { type: "array", items: { type: "string" }, default: [] },
                            min_user_tier: {
                                type: "string",
                                enum: ["bronze", "silver", "gold", "platinum"],
                                nullable: true
                            },
                        },
                    },
                    min_order_value: { type: "number", example: 0 },
                    usage_limit: {
                        type: "integer",
                        example: 1000,
                        minimum: 1
                    },
                    usage_per_user_limit: {
                        type: "integer",
                        example: 2,
                        minimum: 1
                    },
                    usage_count: { type: "integer", example: 450, minimum: 0 },
                    usage_percentage: { type: "number", example: 45 },
                    is_stackable: { type: "boolean", example: false },
                    stack_priority: { type: "integer", example: 0 },
                    started_at: { type: "string", format: "date-time" },
                    expiry_date: { type: "string", format: "date-time" },
                    is_active: { type: "boolean", example: true },
                    time_remaining: { type: "string", example: "28 days remaining" },
                    status: { type: "string", enum: ["active", "inactive", "paused", "expired"], example: "active" },
                    status_label: { type: "string", example: "Active" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "code", "type", "value", "status", "created_at", "updated_at"],
            },

            DiscountListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    code: { type: "string" },
                    type: { type: "string", enum: ["percent", "fixed"] },
                    type_label: { type: "string", example: "Percentage" },
                    value: { type: "number" },
                    display_value: { type: "string", example: "50% off" },
                    applicable_targets_type: { type: "string" },
                    targets_count: { type: "integer", example: 0 },
                    usage_count: { type: "integer" },
                    usage_limit: { type: "integer" },
                    usage_percentage: { type: "number" },
                    status: { type: "string", enum: ["active", "inactive", "paused", "expired"] },
                    status_label: { type: "string" },
                    is_active: { type: "boolean" },
                    time_remaining: { type: "string" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    can_edit: { type: "boolean" },
                    can_delete: { type: "boolean" },
                    can_activate: { type: "boolean" },
                    can_pause: { type: "boolean" },
                },
                required: ["id", "code", "type", "value", "status", "created_at"],
            },

            DiscountValidationResponse: {
                type: "object",
                properties: {
                    discount_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    code: { type: "string", example: "SALE50" },
                    type: { type: "string", enum: ["percent", "fixed"] },
                    original_value: { type: "number", example: 50 },
                    display_value: { type: "string", example: "50% off" },
                    discount_amount: { type: "number", example: 500000 },
                    discount_amount_formatted: { type: "string", example: "500,000 ₫" },
                    final_total: { type: "number", example: 9500000 },
                    final_total_formatted: { type: "string", example: "9,500,000 ₫" },
                    applicable_item_count: { type: "integer", example: 2 },
                    applicable_item_ids: { type: "array", items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                    you_save: { type: "number", example: 500000 },
                    you_save_formatted: { type: "string", example: "500,000 ₫" },
                    warning: { type: "string", nullable: true, example: "Only 3 uses left" },
                },
                required: ["discount_id", "code", "type", "discount_amount", "final_total"],
            },

            BulkCreateDiscountResult: {
                type: "object",
                properties: {
                    created: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Discount" },
                    },
                    failed: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                code: { type: "string" },
                                error: { type: "string" },
                            },
                        },
                    },
                },
                required: ["created", "failed"],
            },

            DiscountStatsResponse: {
                type: "object",
                properties: {
                    total_discounts: { type: "integer", example: 150 },
                    active_discounts: { type: "integer", example: 45 },
                    expired_discounts: { type: "integer", example: 50 },
                    total_usage: { type: "integer", example: 12500 },
                    total_discount_amount: { type: "number", example: 5000000000 },
                    expiring_soon: { type: "integer", example: 8 },
                    by_type: {
                        type: "object",
                        properties: {
                            percent: { type: "integer", example: 100 },
                            fixed: { type: "integer", example: 50 },
                        },
                    },
                    by_status: {
                        type: "object",
                        properties: {
                            active: { type: "integer", example: 45 },
                            inactive: { type: "integer", example: 60 },
                            paused: { type: "integer", example: 25 },
                            expired: { type: "integer", example: 20 },
                        },
                    },
                },
            },

            // ===== RESPONSE SCHEMAS =====
            DiscountResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Discount" },
                },
                required: ["success", "data"],
            },

            DiscountsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/DiscountListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", minimum: 1, example: 1 },
                            limit: { type: "integer", minimum: 1, example: 20 },
                            total: { type: "integer", example: 150 },
                            totalPages: { type: "integer", example: 8 },
                        },
                        required: ["page", "limit", "total", "totalPages"],
                    },
                },
                required: ["success", "data", "pagination"],
            },

            ValidateDiscountResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/DiscountValidationResponse" },
                },
                required: ["success", "data"],
            },

            BulkCreateDiscountResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/BulkCreateDiscountResult" },
                },
                required: ["success", "data"],
            },

            DiscountStatsResponseWrapper: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            total_discounts: { type: "integer", example: 150 },
                            active_discounts: { type: "integer", example: 45 },
                            expired_discounts: { type: "integer", example: 50 },
                            total_usage: { type: "integer", example: 12500 },
                            total_discount_amount: { type: "number", example: 5000000000 },
                            expiring_soon: { type: "integer", example: 8 },
                            by_type: {
                                type: "object",
                                properties: {
                                    percent: { type: "integer", example: 100 },
                                    fixed: { type: "integer", example: 50 },
                                },
                            },
                            by_status: {
                                type: "object",
                                properties: {
                                    active: { type: "integer", example: 45 },
                                    inactive: { type: "integer", example: 60 },
                                    paused: { type: "integer", example: 25 },
                                    expired: { type: "integer", example: 20 },
                                },
                            },
                        },
                        required: ["total_discounts", "active_discounts", "by_type", "by_status"]
                    },
                },
                required: ["success", "data"],
            },

            // SHIPMENT ROUTES
            ShippingAddress: {
                type: 'object',
                required: ['recipient_name', 'phone', 'address', 'ward', 'district', 'province'],
                properties: {
                    recipient_name: { type: 'string', example: 'Nguyễn Văn A' },
                    phone: { type: 'string', example: '0912345678' },
                    address: { type: 'string', example: '123 Đường ABC' },
                    ward: { type: 'string', example: 'Phường 1' },
                    district: { type: 'string', example: 'Quận 1' },
                    province: { type: 'string', example: 'TP. Hồ Chí Minh' },
                    postal_code: { type: 'string', example: '70000' },
                    country: { type: 'string', default: 'Vietnam' },
                },
            },

            Timeline: {
                type: 'object',
                properties: {
                    created_at: { type: 'string', format: 'date-time' },
                    picked_up_at: { type: 'string', format: 'date-time', nullable: true },
                    in_transit_at: { type: 'string', format: 'date-time', nullable: true },
                    at_destination_at: { type: 'string', format: 'date-time', nullable: true },
                    delivered_at: { type: 'string', format: 'date-time', nullable: true },
                    failed_at: { type: 'string', format: 'date-time', nullable: true },
                    cancelled_at: { type: 'string', format: 'date-time', nullable: true },
                    returned_at: { type: 'string', format: 'date-time', nullable: true },
                },
            },

            FailureInfo: {
                type: 'object',
                nullable: true,
                properties: {
                    reason: {
                        type: 'string',
                        enum: ['address_incorrect', 'recipient_unavailable', 'refused_delivery', 'damaged_package', 'lost', 'weather_delay', 'carrier_error', 'other'],
                    },
                    reason_label: { type: 'string' },
                    notes: { type: 'string' },
                    retry_count: { type: 'integer', minimum: 0 },
                    max_retries: { type: 'integer' },
                    can_retry: { type: 'boolean' },
                    last_retry_at: { type: 'string', format: 'date-time', nullable: true },
                    next_retry_available_at: { type: 'string', format: 'date-time' },
                },
            },

            ShipmentDTO: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    order_id: { type: 'string' },
                    carrier: { type: 'string', enum: ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'] },
                    tracking_code: { type: 'string' },
                    tracking_url: { type: 'string', nullable: true },
                    shipping_address: { $ref: '#/components/schemas/ShippingAddress' },
                    status: { type: 'string', enum: ['pending', 'picked_up', 'in_transit', 'at_destination', 'delivered', 'failed', 'cancelled', 'returned'] },
                    status_label: { type: 'string' },
                    timeline: { $ref: '#/components/schemas/Timeline' },
                    progress: { type: 'integer', minimum: 0, maximum: 100 },
                    failure: { $ref: '#/components/schemas/FailureInfo' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                },
            },

            ShipmentListDTO: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    order_id: { type: 'string' },
                    carrier: { type: 'string' },
                    tracking_code: { type: 'string' },
                    status: { type: 'string' },
                    status_label: { type: 'string' },
                    progress: { type: 'integer' },
                    recipient_name: { type: 'string' },
                    destination: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    delivered_at: { type: 'string', format: 'date-time', nullable: true },
                },
            },

            TrackingDTO: {
                type: 'object',
                properties: {
                    order_id: { type: 'string' },
                    status: { type: 'string' },
                    status_label: { type: 'string' },
                    progress: { type: 'integer' },
                    carrier: { type: 'string' },
                    tracking_code: { type: 'string' },
                    tracking_url: { type: 'string', nullable: true },
                    timeline: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                timestamp: { type: 'string', format: 'date-time' },
                                timestamp_formatted: { type: 'string' },
                                status: { type: 'string' },
                                label: { type: 'string' },
                            },
                        },
                    },
                    destination: { type: 'string' },
                    estimated_delivery: { type: 'string' },
                    last_update: { type: 'string', format: 'date-time' },
                },
            },

            PaginationMeta: {
                type: 'object',
                properties: {
                    page: {
                        type: 'integer'
                    },
                    limit: {
                        type: 'integer'
                    },
                    total: {
                        type: 'integer'
                    },
                    totalPages: {
                        type: 'integer'
                    }
                }
            },

            ErrorResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    code: {
                        type: 'string',
                        example: 'SHIPMENT_NOT_FOUND'
                    },
                    message: {
                        type: 'string',
                        example: 'Shipment not found'
                    }
                }
            },

            CreateShipmentInput: {
                type: 'object',
                required: ['order_id', 'carrier', 'tracking_code'],
                properties: {
                    order_id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                    carrier: { type: 'string', enum: ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'] },
                    tracking_code: { type: 'string', minLength: 5, maxLength: 100, pattern: '^[A-Z0-9\\-_]+$' },
                    shipping_address: { $ref: '#/components/schemas/ShippingAddress' },
                },
            },

            UpdateShipmentStatusInput: {
                type: 'object',
                required: ['status'],
                properties: {
                    status: {
                        type: 'string',
                        enum: ['pending', 'picked_up', 'in_transit', 'at_destination', 'delivered', 'failed', 'cancelled', 'returned'],
                    },
                    notes: { type: 'string', maxLength: 500 },
                },
            },

            RecordShipmentFailureInput: {
                type: 'object',
                required: ['failure_reason'],
                properties: {
                    failure_reason: {
                        type: 'string',
                        enum: ['address_incorrect', 'recipient_unavailable', 'refused_delivery', 'damaged_package', 'lost', 'weather_delay', 'carrier_error', 'other'],
                    },
                    failure_notes: { type: 'string', maxLength: 500 },
                },
            },

            CancelShipmentInput: {
                type: 'object',
                required: ['reason'],
                properties: {
                    reason: { type: 'string', minLength: 5, maxLength: 500 },
                },
            },

            // ===== RESPONSE SCHEMAS =====

            ShipmentResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ShipmentDTO' },
                },
            },

            ShipmentsListResponse: {
                type: 'object',
                required: ['success', 'data', 'pagination'],
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ShipmentListDTO' },
                    },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
            },

            TrackingResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/TrackingDTO' },
                },
            },

            ReviewDTO: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439012" },
                    product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439010" },
                    variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439011" },
                    order_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", example: "507f1f77bcf86cd799439013" },

                    is_verified_purchase: { type: "boolean", example: true },

                    rating: {
                        type: "object",
                        properties: {
                            overall: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                            quality: { type: ["integer", "null"], minimum: 1, maximum: 5, nullable: true },
                            value_for_money: { type: ["integer", "null"], minimum: 1, maximum: 5, nullable: true },
                            delivery_speed: { type: ["integer", "null"], minimum: 1, maximum: 5, nullable: true },
                        },
                        required: ["overall"],
                    },

                    title: { type: "string", maxLength: 200, example: "Great product!", nullable: true },
                    content: { type: "string", minLength: 10, maxLength: 5000, example: "This product exceeded my expectations..." },

                    edit_count: { type: "integer", minimum: 0, example: 0 },
                    edited_at: { type: "string", format: "date-time", nullable: true },

                    helpful_count: { type: "integer", minimum: 0, example: 15 },
                    unhelpful_count: { type: "integer", minimum: 0, example: 2 },
                    user_vote: { type: ["string", "null"], enum: ["helpful", "unhelpful", null], example: null },

                    is_approved: { type: "boolean", example: true },

                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
                required: ["id", "user_id", "product_id", "variant_id", "order_id", "is_verified_purchase", "rating", "content", "created_at", "updated_at"],
            },

            ReviewListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },

                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    title: { type: "string", nullable: true },
                    content: { type: "string" },

                    is_verified_purchase: { type: "boolean" },
                    helpful_count: { type: "integer" },
                    unhelpful_count: { type: "integer" },
                    user_vote: { type: ["string", "null"], enum: ["helpful", "unhelpful", null] },

                    created_at: { type: "string", format: "date-time" },
                    edited_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "user_id", "product_id", "variant_id", "rating", "content", "created_at"],
            },

            AdminReviewDTO: {
                allOf: [
                    { $ref: "#/components/schemas/ReviewDTO" },
                    {
                        type: "object",
                        properties: {
                            is_flagged: { type: "boolean", example: false },
                            flag_reason: { type: ["string", "null"], enum: ["spam", "inappropriate", "fake", "duplicate", "other"], nullable: true },
                            approved_at: { type: "string", format: "date-time", nullable: true },
                            approved_by: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                            rejected_at: { type: "string", format: "date-time", nullable: true },
                            rejection_reason: { type: "string", nullable: true },
                            flagged_by: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },
                        },
                    },
                ],
            },

            // Request/Response schemas
            CreateReviewInput: {
                type: "object",
                properties: {
                    product_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Product ID",
                        example: "507f1f77bcf86cd799439010",
                    },
                    variant_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Variant ID",
                        example: "507f1f77bcf86cd799439011",
                    },
                    order_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        description: "Order ID (must be completed)",
                        example: "507f1f77bcf86cd799439013",
                    },
                    rating: {
                        type: "integer",
                        minimum: 1,
                        maximum: 5,
                        description: "Rating from 1-5",
                        example: 5,
                    },
                    title: {
                        type: "string",
                        maxLength: 200,
                        description: "Review title (optional)",
                        example: "Great product!",
                    },
                    content: {
                        type: "string",
                        minLength: 10,
                        maxLength: 5000,
                        description: "Review content (minimum 10 chars)",
                        example: "This product exceeded my expectations. Quality is excellent and delivery was fast.",
                    },
                },
                required: ["product_id", "variant_id", "order_id", "rating", "content"],
            },

            UpdateReviewInput: {
                type: "object",
                properties: {
                    rating: {
                        type: "integer",
                        minimum: 1,
                        maximum: 5,
                        description: "Rating (optional)",
                    },
                    title: {
                        type: "string",
                        maxLength: 200,
                        description: "Review title (optional)",
                    },
                    content: {
                        type: "string",
                        minLength: 10,
                        maxLength: 5000,
                        description: "Review content (optional)",
                    },
                },
            },

            MarkHelpfulInput: {
                type: "object",
                properties: {
                    helpful: {
                        type: "boolean",
                        description: "true = helpful, false = unhelpful",
                        example: true,
                    },
                },
                required: ["helpful"],
            },

            FlagReviewInput: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        enum: ["spam", "inappropriate", "fake", "duplicate", "other"],
                        description: "Flag reason",
                        example: "spam",
                    },
                },
                required: ["reason"],
            },

            RejectReviewInput: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        minLength: 5,
                        maxLength: 500,
                        description: "Rejection reason",
                        example: "Contains inappropriate language",
                    },
                },
                required: ["reason"],
            },

            // Response schemas
            ReviewResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/ReviewDTO" },
                },
                required: ["success", "data"],
            },

            ReviewsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ReviewListItem" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", minimum: 1, example: 1 },
                            limit: { type: "integer", minimum: 1, example: 10 },
                            total: { type: "integer", example: 25 },
                            totalPages: { type: "integer", example: 3 },
                        },
                        required: ["page", "limit", "total", "totalPages"],
                    },
                },
                required: ["success", "data", "pagination"],
            },

            AdminReviewsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AdminReviewDTO" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", minimum: 1, example: 1 },
                            limit: { type: "integer", minimum: 1, example: 20 },
                            total: { type: "integer", example: 50 },
                            totalPages: { type: "integer", example: 3 },
                        },
                        required: ["page", "limit", "total", "totalPages"],
                    },
                },
                required: ["success", "data", "pagination"],
            },

            // Banners
            BannerImage: {
                type: 'object',
                required: ['url'],
                properties: {
                    url: {
                        type: 'string',
                        format: 'uri',
                        description: 'Banner image URL (HTTP/HTTPS)'
                    },
                    alt_text: {
                        type: 'string',
                        maxLength: 200,
                        description: 'Alt text for SEO'
                    },
                    public_id: {
                        type: 'string',
                        description: 'Cloudinary/S3 public ID for deletion'
                    }
                }
            },

            CreateBannerInput: {
                type: 'object',
                required: ['image', 'link', 'location', 'sort_order', 'start_at', 'end_at'],
                properties: {
                    image: {
                        $ref: '#/components/schemas/BannerImage'
                    },
                    link: {
                        type: 'string',
                        minLength: 1,
                        description: 'Destination URL, route, or product ID'
                    },
                    location: {
                        type: 'string',
                        enum: ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page'],
                        description: 'Banner location on website'
                    },
                    sort_order: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 999,
                        description: 'Display order within location'
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 start datetime'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'ISO 8601 end datetime (must be after start_at)'
                    }
                }
            },

            UpdateBannerInput: {
                type: 'object',
                properties: {
                    image: {
                        $ref: '#/components/schemas/BannerImage'
                    },
                    link: {
                        type: 'string',
                        minLength: 1
                    },
                    location: {
                        type: 'string',
                        enum: ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page']
                    },
                    sort_order: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 999
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },

            Banner: {
                type: 'object',
                required: ['id', 'image', 'link', 'location', 'sort_order', 'start_at', 'end_at', 'is_active', 'created_at', 'updated_at'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        description: 'Banner ID (MongoDB ObjectId)'
                    },
                    image: {
                        $ref: '#/components/schemas/BannerImage'
                    },
                    link: {
                        type: 'string',
                        description: 'Destination URL/route/ID'
                    },
                    location: {
                        type: 'string',
                        enum: ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page'],
                        description: 'Banner location'
                    },
                    sort_order: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 999,
                        description: 'Display order'
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Campaign start time'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Campaign end time'
                    },
                    is_active: {
                        type: 'boolean',
                        description: 'computed: true if now is between start_at and end_at'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    created_by: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        nullable: true,
                        description: 'User ID who created the banner'
                    }
                }
            },

            BannerListItem: {
                type: 'object',
                required: ['id', 'image', 'location', 'sort_order', 'is_active', 'created_at'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$'
                    },
                    image: {
                        $ref: '#/components/schemas/BannerImage'
                    },
                    location: {
                        type: 'string',
                        enum: ['homepage_top', 'homepage_middle', 'homepage_bottom', 'category_page']
                    },
                    sort_order: {
                        type: 'integer'
                    },
                    is_active: {
                        type: 'boolean'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },

            BannerResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    data: {
                        $ref: '#/components/schemas/Banner'
                    }
                }
            },

            BannersListResponse: {
                type: 'object',
                required: ['success', 'data', 'pagination'],
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    data: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/BannerListItem'
                        }
                    },
                    pagination: {
                        type: 'object',
                        required: ['page', 'limit', 'total', 'totalPages'],
                        properties: {
                            page: {
                                type: 'integer',
                                example: 1
                            },
                            limit: {
                                type: 'integer',
                                example: 10
                            },
                            total: {
                                type: 'integer',
                                example: 100
                            },
                            totalPages: {
                                type: 'integer',
                                example: 10
                            }
                        }
                    }
                }
            },

            // Announcements
            AnnouncementImage: {
                type: 'object',
                required: ['url'],
                properties: {
                    url: {
                        type: 'string',
                        format: 'uri',
                        description: 'HTTP(S) image URL'
                    },
                    alt_text: {
                        type: 'string',
                        maxLength: 200,
                        description: 'SEO alt text'
                    },
                    public_id: {
                        type: 'string',
                        description: 'Cloudinary/S3 public ID for deletion'
                    }
                }
            },

            Announcement: {
                type: 'object',
                required: [
                    'id',
                    'title',
                    'content',
                    'priority',
                    'target',
                    'type',
                    'start_at',
                    'end_at',
                    'is_dismissible',
                    'is_active',
                    'created_at',
                    'updated_at'
                ],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$'
                    },
                    title: {
                        type: 'string',
                        minLength: 5,
                        maxLength: 200,
                        example: 'Khuyến mãi Black Friday'
                    },
                    content: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 5000,
                        example: 'Giảm giá lên đến 50% cho tất cả sản phẩm...'
                    },
                    priority: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 10,
                        default: 0,
                        description: 'Độ ưu tiên hiển thị (cao nhất = 10)'
                    },
                    target: {
                        type: 'string',
                        enum: ['all', 'user', 'admin', 'guest'],
                        default: 'all',
                        description: 'Ai có thể thấy thông báo'
                    },
                    type: {
                        type: 'string',
                        enum: ['info', 'warning', 'promotion', 'system', 'urgent'],
                        default: 'info',
                        description: 'Loại thông báo (dùng cho styling UI)'
                    },
                    is_dismissible: {
                        type: 'boolean',
                        default: true,
                        description: 'Người dùng có thể đóng được không'
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Thời gian bắt đầu hiển thị'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Thời gian kết thúc hiển thị (phải > start_at)'
                    },
                    is_active: {
                        type: 'boolean',
                        description: 'Computed: start_at ≤ now < end_at'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    created_by: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        nullable: true,
                        description: 'User ID của người tạo'
                    }
                }
            },

            AnnouncementListItem: {
                allOf: [
                    { $ref: '#/components/schemas/Announcement' },
                    {
                        type: 'object',
                        properties: {
                            days_remaining: {
                                type: 'integer',
                                nullable: true,
                                description: 'Số ngày còn lại (nếu chưa hết hạn)'
                            }
                        }
                    }
                ]
            },

            CreateAnnouncementInput: {
                type: 'object',
                required: [
                    'title',
                    'content',
                    'start_at',
                    'end_at'
                ],
                properties: {
                    title: {
                        type: 'string',
                        minLength: 5,
                        maxLength: 200
                    },
                    content: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 5000
                    },
                    priority: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 10,
                        default: 0
                    },
                    target: {
                        type: 'string',
                        enum: ['all', 'user', 'admin', 'guest'],
                        default: 'all'
                    },
                    type: {
                        type: 'string',
                        enum: ['info', 'warning', 'promotion', 'system', 'urgent'],
                        default: 'info'
                    },
                    is_dismissible: {
                        type: 'boolean',
                        default: true
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                },
                example: {
                    title: 'Khuyến mãi Black Friday',
                    content: 'Giảm giá lên đến 50% cho tất cả sản phẩm trong 24 giờ tới',
                    priority: 10,
                    target: 'all',
                    type: 'promotion',
                    is_dismissible: true,
                    start_at: '2026-04-06T00:00:00Z',
                    end_at: '2026-04-07T00:00:00Z'
                }
            },

            UpdateAnnouncementInput: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        minLength: 5,
                        maxLength: 200
                    },
                    content: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 5000
                    },
                    priority: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 10
                    },
                    target: {
                        type: 'string',
                        enum: ['all', 'user', 'admin', 'guest']
                    },
                    type: {
                        type: 'string',
                        enum: ['info', 'warning', 'promotion', 'system', 'urgent']
                    },
                    is_dismissible: {
                        type: 'boolean'
                    },
                    start_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    end_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                },
                description: 'All fields optional (PATCH)'
            },

            AnnouncementResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    data: {
                        $ref: '#/components/schemas/Announcement'
                    }
                }
            },

            AnnouncementsListResponse: {
                type: 'object',
                required: ['success', 'data', 'pagination'],
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    data: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/AnnouncementListItem'
                        }
                    },
                    pagination: {
                        type: 'object',
                        required: ['page', 'limit', 'total', 'totalPages'],
                        properties: {
                            page: {
                                type: 'integer',
                                example: 1
                            },
                            limit: {
                                type: 'integer',
                                example: 20
                            },
                            total: {
                                type: 'integer',
                                example: 100
                            },
                            totalPages: {
                                type: 'integer',
                                example: 5
                            }
                        }
                    }
                }
            },

            // ===== SHOP INFO SCHEMAS =====
            ShopInfo: {
                type: 'object',
                required: ['id', 'shop_name', 'email', 'phone', 'address', 'working_hours', 'status', 'created_at', 'updated_at'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[a-fA-F0-9]{24}$',
                        description: 'Shop info ID (MongoDB ObjectId)',
                        example: '507f1f77bcf86cd799439011'
                    },
                    shop_name: {
                        type: 'string',
                        minLength: 2,
                        maxLength: 100,
                        example: 'Nguyễn Liên Shop'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'contact@nguyen-lien.com'
                    },
                    phone: {
                        type: 'string',
                        pattern: '^(\\+84|0)[0-9]{9,10}$',
                        example: '0912345678'
                    },
                    address: {
                        type: 'string',
                        maxLength: 500,
                        example: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh'
                    },
                    working_hours: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['day', 'open', 'close'],
                            properties: {
                                day: {
                                    type: 'string',
                                    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                                    example: 'mon'
                                },
                                open: {
                                    type: 'string',
                                    pattern: '^\\d{2}:\\d{2}$',
                                    example: '08:00'
                                },
                                close: {
                                    type: 'string',
                                    pattern: '^\\d{2}:\\d{2}$',
                                    example: '18:00'
                                }
                            }
                        },
                        example: [
                            { day: 'mon', open: '08:00', close: '18:00' },
                            { day: 'tue', open: '08:00', close: '18:00' }
                        ]
                    },
                    social_links: {
                        type: 'object',
                        properties: {
                            facebook: { type: 'string', example: 'https://facebook.com/nguyen-lien' },
                            zalo: { type: 'string', example: '0912345678' },
                            instagram: { type: 'string', example: 'https://instagram.com/nguyen-lien' },
                            shoppe: { type: 'string', example: 'https://shopee.vn/nguyen-lien' }
                        }
                    },
                    map_embed_url: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        example: 'https://www.google.com/maps/embed?pb=...'
                    },
                    is_active: {
                        type: 'boolean',
                        default: true,
                        description: 'Shop status (active/inactive)'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },

            ContactInfo: {
                type: 'object',
                required: ['shop_name', 'email', 'phone', 'address'],
                properties: {
                    shop_name: { type: 'string', example: 'Nguyễn Liên Shop' },
                    email: { type: 'string', format: 'email', example: 'contact@nguyen-lien.com' },
                    phone: {
                        type: 'string',
                        pattern: '^(\\+84|0)[0-9]{9,10}$',
                        example: '0912345678'
                    },
                    address: { type: 'string', example: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh' },
                    is_active: { type: 'boolean', example: true }
                }
            },

            WorkingHoursDTO: {
                type: 'object',
                required: ['shop_name', 'working_hours'],
                properties: {
                    shop_name: { type: 'string', example: 'Nguyễn Liên Shop' },
                    working_hours: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
                                open: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                                close: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
                            }
                        }
                    },
                    is_active: { type: 'boolean', example: true }
                }
            },

            SocialLinksDTO: {
                type: 'object',
                required: ['shop_name', 'social_links'],
                properties: {
                    shop_name: { type: 'string', example: 'Nguyễn Liên Shop' },
                    social_links: {
                        type: 'object',
                        properties: {
                            facebook: { type: 'string', nullable: true },
                            zalo: { type: 'string', nullable: true },
                            instagram: { type: 'string', nullable: true },
                            shoppe: { type: 'string', nullable: true }
                        }
                    },
                    is_active: { type: 'boolean', example: true }
                }
            },

            IsOpenResponse: {
                type: 'object',
                required: ['is_open'],
                properties: {
                    is_open: {
                        type: 'boolean',
                        description: 'Current shop open status',
                        example: true
                    }
                }
            },

            NextOpeningTime: {
                type: 'object',
                properties: {
                    date: { type: 'string', format: 'date', example: '2026-04-06' },
                    time: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '08:00' },
                    day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], example: 'mon' }
                }
            },

            CreateShopInfoInput: {
                type: 'object',
                required: ['shop_name', 'email', 'phone', 'address', 'working_hours'],
                properties: {
                    shop_name: {
                        type: 'string',
                        minLength: 2,
                        maxLength: 100,
                        example: 'Nguyễn Liên Shop'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'contact@nguyen-lien.com'
                    },
                    phone: {
                        type: 'string',
                        pattern: '^(\\+84|0)[0-9]{9,10}$',
                        example: '0912345678'
                    },
                    address: {
                        type: 'string',
                        maxLength: 500,
                        example: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh'
                    },
                    working_hours: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['day', 'open', 'close'],
                            properties: {
                                day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
                                open: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                                close: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
                            }
                        }
                    },
                    social_links: {
                        type: 'object',
                        properties: {
                            facebook: { type: 'string' },
                            zalo: { type: 'string' },
                            instagram: { type: 'string' },
                            shoppe: { type: 'string' }
                        }
                    },
                    map_embed_url: {
                        type: 'string',
                        format: 'uri',
                        nullable: true
                    },
                    is_active: {
                        type: 'boolean',
                        default: true
                    }
                }
            },

            UpdateShopInfoInput: {
                type: 'object',
                description: 'All fields optional (PATCH)',
                properties: {
                    shop_name: { type: 'string', minLength: 2, maxLength: 100 },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string', pattern: '^(\\+84|0)[0-9]{9,10}$' },
                    address: { type: 'string', maxLength: 500 },
                    working_hours: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            properties: {
                                day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
                                open: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                                close: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
                            }
                        }
                    },
                    social_links: {
                        type: 'object',
                        properties: {
                            facebook: { type: 'string' },
                            zalo: { type: 'string' },
                            instagram: { type: 'string' },
                            shoppe: { type: 'string' }
                        }
                    },
                    map_embed_url: { type: 'string', format: 'uri', nullable: true },
                    is_active: { type: 'boolean' }
                }
            },

            ToggleShopStatusInput: {
                type: 'object',
                required: ['is_active'],
                properties: {
                    is_active: {
                        type: 'boolean',
                        description: 'Activate (true) or deactivate (false) shop',
                        example: false
                    }
                }
            },

            ShopInfoResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ShopInfo' }
                }
            },

            ContactInfoResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ContactInfo' }
                }
            },

            WorkingHoursResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/WorkingHoursDTO' }
                }
            },

            SocialLinksResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/SocialLinksDTO' }
                }
            },

            IsOpenResponseWrapper: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/IsOpenResponse' }
                }
            },

            NextOpeningTimeResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                        oneOf: [
                            { $ref: '#/components/schemas/NextOpeningTime' },
                            { type: 'null' }
                        ]
                    }
                }
            },

            // Notification

            NotificationData: {
                type: "object",
                properties: {
                    ref_type: {
                        type: "string",
                        enum: ["order", "payment", "discount", "product", null],
                        example: "order"
                    },
                    ref_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$",
                        example: "507f1f77bcf86cd799439013",
                        nullable: true
                    },
                    extra: {
                        type: "object",
                        nullable: true
                    }
                }
            },

            Notification: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    user_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    type: { type: "string", enum: ["order", "system", "promotion"] },
                    title: { type: "string", minLength: 1, maxLength: 200 },
                    message: { type: "string", minLength: 1, maxLength: 1000 },

                    data: {
                        type: "object",
                        properties: {
                            ref_type: { type: "string", enum: ["order", "payment", "discount", "product", null] },
                            ref_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true },  // ✅ ADDED
                            extra: { type: "object", nullable: true }  // ✅ ADDED
                        }
                    },

                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    is_read: { type: "boolean" },
                    read_at: { type: "string", format: "date-time", nullable: true },

                    delivered_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true  // ✅ ADDED
                    },

                    expire_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true  // ✅ ADDED
                    },

                    created_at: { type: "string", format: "date-time" }
                },
                required: ["id", "user_id", "type", "title", "message", "priority", "is_read", "created_at"]
            },

            NotificationListItem: {
                type: "object",
                properties: {
                    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    type: { type: "string", enum: ["order", "system", "promotion"] },
                    title: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    is_read: { type: "boolean" },
                    created_at: { type: "string", format: "date-time" }
                },
                required: ["id", "type", "title", "priority", "is_read", "created_at"]
            },

            CreateNotificationInput: {
                type: "object",
                properties: {
                    user_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$"
                    },
                    type: {
                        type: "string",
                        enum: ["order", "system", "promotion"]
                    },
                    title: {
                        type: "string",
                        minLength: 1,
                        maxLength: 200
                    },
                    message: {
                        type: "string",
                        minLength: 1,
                        maxLength: 1000
                    },
                    data: {
                        $ref: "#/components/schemas/NotificationData"
                    },
                    priority: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                        default: "low"
                    },
                    expire_at: {
                        type: "string",
                        format: "date-time"
                    }
                },
                required: ["user_id", "type", "title", "message"]
            },

            MarkAsReadInput: {
                type: "object",
                properties: {
                    notification_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$"
                    }
                },
                required: ["notification_id"]
            },

            BulkMarkAsReadInput: {
                type: "object",
                properties: {
                    notification_ids: {
                        type: "array",
                        items: {
                            type: "string",
                            pattern: "^[a-fA-F0-9]{24}$"
                        },
                        minItems: 1,
                        maxItems: 100,
                        example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
                    }
                },
                required: ["notification_ids"]
            },

            DeleteNotificationInput: {
                type: "object",
                properties: {
                    notification_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$"
                    }
                },
                required: ["notification_id"]
            },

            NotificationResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Notification" }
                },
                required: ["success", "data"]
            },

            NotificationsListResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/NotificationListItem" }
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 10 },
                            total: { type: "integer", example: 45 },
                            totalPages: { type: "integer", example: 5 },
                            has_more: { type: "boolean", example: false }
                        },
                        required: ["page", "limit", "total", "totalPages"]
                    }
                },
                required: ["success", "data", "pagination"]
            },

            UnreadCountResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            unread_count: {
                                type: "integer",
                                minimum: 0,
                                example: 5
                            }
                        },
                        required: ["unread_count"]
                    }
                },
                required: ["success", "data"]
            },

            MarkAllAsReadResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            marked_count: { type: "integer", example: 10 }
                        },
                        required: ["marked_count"]
                    }
                },
                required: ["success", "data"]
            },

            MarkAllAsReadInput: {
                type: "object",
                properties: {
                    // No parameters needed - mark all user's notifications as read
                },
                required: []
            },

            DeleteNotificationInput: {
                type: "object",
                properties: {
                    notification_id: {
                        type: "string",
                        pattern: "^[a-fA-F0-9]{24}$"
                    }
                },
                required: ["notification_id"]
            },

            BulkMarkAsReadResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: {
                        type: "object",
                        properties: {
                            marked_count: { type: "integer", example: 5 }
                        },
                        required: ["marked_count"]
                    }
                },
                required: ["success", "data"]
            },

            //Chatbots
            ChatSessionResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            last_message_at: { type: "string", format: "date-time" }
                        }
                    }
                }
            },

            ChatMessageResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    data: {
                        type: "object",
                        properties: {
                            reply: { type: "string" },
                            intent: { type: "string", enum: ["GREETING", "ASK_PRICE", "SEARCH_PRODUCT", "ORDER_STATUS", "UNKNOWN"] },
                            session_id: { type: "string" },
                            related_data: { type: "object", nullable: true }
                        }
                    }
                }
            }
        },
    },
    paths: {
        "/api/v1/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RegisterInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RegisterSuccessResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login",
                security: [],
                description:
                    "Body trả `accessToken` + `user`. Refresh token được **Set-Cookie** tên `refreshToken`: **httpOnly**; **secure=true** khi `NODE_ENV=production`; **sameSite** = `lax` (môi trường thường) hoặc `none` (production, thường dùng kết hợp `secure` cho cross-site).",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/auth/refresh": {
            post: {
                tags: ["Auth"],
                summary: "Refresh access token",
                security: [{ refreshTokenCookie: [] }],
                description:
                    "Bắt buộc có cookie `refreshToken` (hoặc nhập qua Swagger Authorize). Thành công: body có `accessToken` mới; server có thể Set-Cookie rotate refresh (cùng chính sách httpOnly / secure / sameSite như login).",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RefreshSuccessResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/auth/logout": {
            post: {
                tags: ["Auth"],
                summary: "Logout",
                security: [],
                description:
                    "Cookie **không** bắt buộc. Nếu có `refreshToken`, server thu hồi (best effort) và **luôn** attempt clear cookie. Không dùng Bearer (trừ khi sau này bạn đổi code).",
                parameters: [
                    {
                        in: "cookie",
                        name: "refreshToken",
                        required: false,
                        schema: { type: "string" },
                        description: "httpOnly cookie; tùy chọn.",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LogoutSuccessResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/api/v1/users/me": {
            get: {
                tags: ["Users"],
                summary: "Get current authenticated user",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UserProfileResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/v1/users": {
            get: {
                tags: ["Users"],
                summary: "Get all users",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, default: 20 },
                    },
                    {
                        in: "query",
                        name: "search",
                        schema: { type: "string" },
                    },
                    {
                        in: "query",
                        name: "status",
                        schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UsersListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                },
            },
        },
        "/api/v1/users/{id}": {
            patch: {
                tags: ["Users"],
                summary: "Update user profile",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UserProfileInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UpdateUserResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                },
            },
            delete: {
                tags: ["Users"],
                summary: "Delete user (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteUserResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/users/{id}/roles": {
            patch: {
                tags: ["Users"],
                summary: "Update user roles",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserRolesInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UpdateRolesResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/user-addresses": {
            post: {
                tags: ["User Addresses"],
                summary: "Create a new address",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateUserAddressInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CreateUserAddressResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/user-addresses/{userId}": {
            get: {
                tags: ["User Addresses"],
                summary: "Get all addresses for a user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "userId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                        description: "User ID",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UserAddressListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/user-addresses/{userId}/{addressId}": {
            patch: {
                tags: ["User Addresses"],
                summary: "Update an address",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "userId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                    {
                        in: "path",
                        name: "addressId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserAddressInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UpdateUserAddressResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
            delete: {
                tags: ["User Addresses"],
                summary: "Delete an address",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "userId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                    {
                        in: "path",
                        name: "addressId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteUserAddressResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/user-addresses/{userId}/{addressId}/set-default": {
            patch: {
                tags: ["User Addresses"],
                summary: "Set address as default",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "userId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                    {
                        in: "path",
                        name: "addressId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UpdateUserAddressResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/v1/categories/tree": {
            get: {
                tags: ["Categories"],
                summary: "Get category tree (hierarchical structure)",
                security: [],
                description: "Get all categories organized in a tree structure with parent-child relationships.",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoryTreeResponse" },
                            },
                        },
                    },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/categories/all": {
            get: {
                tags: ["Categories"],
                summary: "Get all categories",
                security: [],
                description: "Get all categories as a flat list.",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoriesListResponse" },
                            },
                        },
                    },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/categories/slug/{slug}": {
            get: {
                tags: ["Categories"],
                summary: "Get category by slug",
                security: [],
                parameters: [
                    {
                        in: "path",
                        name: "slug",
                        required: true,
                        schema: { type: "string" },
                        description: "Category slug",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoryResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/categories/{categoryId}": {
            get: {
                tags: ["Categories"],
                summary: "Get category by ID",
                security: [],
                parameters: [
                    {
                        in: "path",
                        name: "categoryId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                        description: "Category ID",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoryResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            post: {
                tags: ["Categories"],
                summary: "Create category",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateCategoryInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoryResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            patch: {
                tags: ["Categories"],
                summary: "Update category",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "categoryId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateCategoryInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CategoryResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Categories"],
                summary: "Delete category (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "categoryId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteCategoryResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/categories/{categoryId}/breadcrumb": {
            get: {
                tags: ["Categories"],
                summary: "Get category breadcrumb",
                security: [],
                parameters: [
                    {
                        in: "path",
                        name: "categoryId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BreadcrumbResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ✅ PRODUCT PATHS
        "/api/v1/products": {
            get: {
                tags: ["Products"],
                summary: "Get all products",
                security: [],
                parameters: [
                    { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
                    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                    { in: "query", name: "category_id", schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                    { in: "query", name: "min_price", schema: { type: "integer", minimum: 0 } },
                    { in: "query", name: "max_price", schema: { type: "integer", minimum: 0 } },
                    { in: "query", name: "status", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
                    { in: "query", name: "search", schema: { type: "string" } },
                    { in: "query", name: "sortBy", schema: { type: "string", enum: ["popular", "rating", "price_asc", "price_desc", "newest"], default: "newest" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductsListResponse" },
                            },
                        },
                    },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            post: {
                tags: ["Products"],
                summary: "Create product",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateProductInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/products/search": {
            get: {
                tags: ["Products"],
                summary: "Search products",
                security: [],
                parameters: [
                    { in: "query", name: "q", schema: { type: "string", minLength: 2, maxLength: 100 }, required: true },
                    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductsListResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/products/category/{categoryId}": {
            get: {
                tags: ["Products"],
                summary: "Get products by category",
                security: [],
                parameters: [
                    { in: "path", name: "categoryId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductsListResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/products/slug/{slug}": {
            get: {
                tags: ["Products"],
                summary: "Get product by slug",
                security: [],
                parameters: [
                    { in: "path", name: "slug", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductDetailResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/products/{productId}": {
            get: {
                tags: ["Products"],
                summary: "Get product by ID",
                security: [],
                parameters: [
                    { in: "path", name: "productId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductDetailResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            patch: {
                tags: ["Products"],
                summary: "Update product",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "productId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateProductInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ProductResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Products"],
                summary: "Delete product",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "productId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ✅ VARIANT PATHS
        "/api/v1/products/{productId}/variants": {
            get: {
                tags: ["Variants"],
                summary: "Get variants by product",
                security: [],
                parameters: [
                    { in: "path", name: "productId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantsListResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            post: {
                tags: ["Variants"],
                summary: "Create variant",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "productId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateVariantInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}": {
            get: {
                tags: ["Variants"],
                summary: "Get variant by ID",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            patch: {
                tags: ["Variants"],
                summary: "Update variant",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateVariantInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Variants"],
                summary: "Delete variant",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}/stock": {
            get: {
                tags: ["Variants"],
                summary: "Check variant stock",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/StockResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}/max-order-qty": {
            get: {
                tags: ["Variants"],
                summary: "Get max order quantity",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                    { in: "query", name: "pack_size", schema: { type: "integer", minimum: 1, default: 100 } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                                max_packs: { type: "integer", example: 5 },
                                                max_items: { type: "integer", example: 500 },
                                                pack_size: { type: "integer", example: 100 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}/reserve-stock": {
            post: {
                tags: ["Variants"],
                summary: "Reserve stock",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ReserveStockInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/StockResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}/complete-sale": {
            post: {
                tags: ["Variants"],
                summary: "Complete sale",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ReserveStockInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/StockResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/id/{variantId}/release-stock": {
            post: {
                tags: ["Variants"],
                summary: "Release reserved stock",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ReserveStockInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/StockResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ✅ VARIANT UNIT PATHS
        "/api/v1/variant-units/{unitId}": {
            get: {
                tags: ["Variant Units"],
                summary: "Get variant unit by ID",
                security: [],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            patch: {
                tags: ["Variant Units"],
                summary: "Update variant unit",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateVariantUnitInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Variant Units"],
                summary: "Delete variant unit",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DeleteResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/{variantId}/units": {
            get: {
                tags: ["Variant Units"],
                summary: "Get units by variant",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantUnitsListResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            post: {
                tags: ["Variant Units"],
                summary: "Create variant unit",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateVariantUnitInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variants/{variantId}/units/default": {
            get: {
                tags: ["Variant Units"],
                summary: "Get default unit for variant",
                security: [],
                parameters: [
                    { in: "path", name: "variantId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/VariantUnitResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variant-units/{unitId}/price-tiers": {
            get: {
                tags: ["Variant Units"],
                summary: "Get price tiers",
                security: [],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    tier_number: { type: "integer", example: 1 },
                                                    min_qty: { type: "integer", example: 1 },
                                                    max_qty: { type: "integer", nullable: true, example: 10 },
                                                    price: { type: "number", example: 180000 },
                                                    price_per_unit: { type: "number", example: 1800 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variant-units/{unitId}/calculate-price": {
            post: {
                tags: ["Variant Units"],
                summary: "Calculate price",
                security: [],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CalculatePriceInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CalculatePriceResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variant-units/{unitId}/max-orderable-qty": {
            get: {
                tags: ["Variant Units"],
                summary: "Get max orderable quantity",
                security: [],
                parameters: [
                    { in: "path", name: "unitId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                unit_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                                max_orderable_packs: { type: "integer", example: 999 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/variant-units/validate-tiers": {
            post: {
                tags: ["Variant Units"],
                summary: "Validate price tiers",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                minItems: 1,
                                items: {
                                    type: "object",
                                    properties: {
                                        min_qty: { type: "integer", minimum: 1 },
                                        max_qty: { type: "integer", minimum: 1, nullable: true },
                                        unit_price: { type: "number", minimum: 0 },
                                    },
                                    required: ["min_qty", "unit_price"],
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                valid: { type: "boolean", example: true },
                                                message: { type: "string", example: "Price tiers are valid" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ✅ CART PATHS
        "/api/v1/carts/guest": {
            post: {
                tags: ["Carts"],
                summary: "Create guest cart",
                security: [],
                description: "Tạo giỏ hàng cho khách (không đăng nhập). Client gửi session_key (UUID v4).",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateGuestCartInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/guest/{sessionKey}": {
            get: {
                tags: ["Carts"],
                summary: "Get guest cart",
                security: [],
                parameters: [
                    {
                        in: "path",
                        name: "sessionKey",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "Session key UUID v4",
                    },
                    {
                        in: "query",
                        name: "format",
                        schema: { type: "string", enum: ["summary", "detail", "checkout"], default: "summary" },
                        description: "Response format",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts": {
            get: {
                tags: ["Carts"],
                summary: "Get user cart",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "format",
                        schema: { type: "string", enum: ["summary", "detail", "checkout"], default: "summary" },
                        description: "Response format",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Carts"],
                summary: "Clear cart",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "keep_discount",
                        schema: { type: "boolean", default: false },
                        description: "Keep promo code after clearing",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/items": {
            post: {
                tags: ["Carts"],
                summary: "Add item to cart",
                security: [{ bearerAuth: [] }],
                description: "Thêm sản phẩm vào giỏ hàng. Có thể dùng JWT hoặc ?session_key=UUID (cho khách).",
                parameters: [
                    {
                        in: "query",
                        name: "session_key",
                        schema: { type: "string", format: "uuid" },
                        description: "Session key cho giỏ khách (nếu không có JWT)",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AddToCartInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/items/{itemId}": {
            patch: {
                tags: ["Carts"],
                summary: "Update item quantity",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "itemId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateCartItemInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Carts"],
                summary: "Remove item from cart",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "itemId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/discount": {
            post: {
                tags: ["Carts"],
                summary: "Apply promo code",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApplyDiscountInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Carts"],
                summary: "Remove discount",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/merge": {
            post: {
                tags: ["Carts"],
                summary: "Merge guest cart to user cart",
                security: [{ bearerAuth: [] }],
                description: "Gọi sau khi đăng nhập để merge giỏ khách vào giỏ người dùng.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/MergeCartInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/abandon": {
            post: {
                tags: ["Carts"],
                summary: "Mark cart as abandoned",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AbandonedResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/checkout": {
            post: {
                tags: ["Carts"],
                summary: "Validate cart and create order snapshot",
                security: [{ bearerAuth: [] }],
                description: "Kiểm tra giỏ hàng, xác nhận stock, trả về snapshot để tạo order.",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CheckoutResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/carts/validate": {
            get: {
                tags: ["Carts"],
                summary: "Validate cart (dry-run)",
                security: [{ bearerAuth: [] }],
                description: "Kiểm tra giỏ hàng mà không lưu thay đổi (dry-run checkout).",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ValidateResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },
        "/api/v1/admin/carts/abandoned": {
            get: {
                tags: ["Carts"],
                summary: "Get abandoned carts (admin)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "days_ago",
                        schema: { type: "integer", minimum: 1, default: 7 },
                        description: "Abandoned for > N days",
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CartListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ===== PUBLIC ENDPOINTS =====

        "/api/v1/orders/track/{order_code}": {
            get: {
                tags: ["Orders"],
                summary: "Public order tracking",
                security: [],
                description: "Theo dõi đơn hàng công khai (không cần xác thực). Trả về status, timeline, shipment info.",
                parameters: [
                    {
                        in: "path",
                        name: "order_code",
                        required: true,
                        schema: { type: "string", pattern: "^ORD-[0-9]{8}-[A-Z0-9]{5}$", example: "ORD-20240415-ABC12" },
                        description: "Order code (format: ORD-YYYYMMDD-XXXXX)",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderTrackingResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ===== CUSTOMER ENDPOINTS =====

        "/api/v1/orders": {
            post: {
                tags: ["Orders"],
                summary: "Create order from cart",
                security: [{ bearerAuth: [] }],
                description: "Tạo đơn hàng từ giỏ hàng (checkout). Deduction stock ATOMIC tại đây.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateOrderInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            get: {
                tags: ["Orders"],
                summary: "Get user's order history",
                security: [{ bearerAuth: [] }],
                description: "Lấy lịch sử đơn hàng của người dùng (pagination + filtering)",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Trang (default 1)",
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Số item mỗi trang (max 100)",
                    },
                    {
                        in: "query",
                        name: "status",
                        schema: { type: "string", example: "DELIVERED,SHIPPED" },
                        description: "Filter theo status (comma-separated)",
                    },
                    {
                        in: "query",
                        name: "payment_status",
                        schema: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"] },
                        description: "Filter theo payment status",
                    },
                    {
                        in: "query",
                        name: "date_from",
                        schema: { type: "string", format: "date" },
                        description: "Từ ngày (ISO date)",
                    },
                    {
                        in: "query",
                        name: "date_to",
                        schema: { type: "string", format: "date" },
                        description: "Đến ngày (ISO date)",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrdersListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/orders/{order_id}": {
            get: {
                tags: ["Orders"],
                summary: "Get order detail",
                security: [{ bearerAuth: [] }],
                description: "Lấy chi tiết đơn hàng (customer view - ẩn dữ liệu admin).",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                        description: "Order ID",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/orders/{order_id}/cancel": {
            post: {
                tags: ["Orders"],
                summary: "Cancel order",
                security: [{ bearerAuth: [] }],
                description: "Hủy đơn hàng (khách tự hủy). Chỉ có thể hủy PENDING/PAID. Restores stock.",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CancelOrderInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/orders/{order_id}/review": {
            post: {
                tags: ["Orders"],
                summary: "Write review for order item",
                security: [{ bearerAuth: [] }],
                description: "Viết review cho sản phẩm trong đơn hàng. Chỉ có thể review DELIVERED orders.",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/WriteReviewInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ===== ADMIN ENDPOINTS =====

        "/api/v1/admin/orders": {
            get: {
                tags: ["Orders"],
                summary: "Get all orders (admin)",
                security: [{ bearerAuth: [] }],
                description: "Lấy tất cả đơn hàng (admin dashboard với full transparency).",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                    {
                        in: "query",
                        name: "status",
                        schema: { type: "string" },
                        description: "Filter theo status (comma-separated)",
                    },
                    {
                        in: "query",
                        name: "payment_status",
                        schema: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"] },
                    },
                    {
                        in: "query",
                        name: "user_id",
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                        description: "Filter theo customer ID",
                    },
                    {
                        in: "query",
                        name: "date_from",
                        schema: { type: "string", format: "date" },
                    },
                    {
                        in: "query",
                        name: "date_to",
                        schema: { type: "string", format: "date" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrdersListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/stats": {
            get: {
                tags: ["Orders"],
                summary: "Get order statistics",
                security: [{ bearerAuth: [] }],
                description: "Lấy thống kê đơn hàng cho dashboard (total, revenue, breakdown).",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderStatsResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/{order_id}": {
            get: {
                tags: ["Orders"],
                summary: "Get order detail (admin)",
                security: [{ bearerAuth: [] }],
                description: "Lấy chi tiết đơn hàng (admin view - full data)",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/OrderDetailResponse"
                                }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            patch: {
                tags: ["Orders"],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: {
                            type: "string",
                            pattern: "^[a-fA-F0-9]{24}$"
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/AdminUpdateOrderInput"
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/OrderDetailResponse"
                                }
                            }
                        }
                    },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/admin/orders/{order_id}/status": {
            patch: {
                tags: ["Orders"],
                summary: "Update order status",
                security: [{ bearerAuth: [] }],
                description: "Cập nhật trạng thái đơn hàng (admin action).",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateOrderStatusInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/{order_id}/admin-update": {
            patch: {
                tags: ["Orders"],
                summary: "Update order details (admin)",
                security: [{ bearerAuth: [] }],
                description: "Cập nhật chi tiết đơn hàng (status, notes).",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AdminUpdateOrderInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/{order_id}/fulfill": {
            post: {
                tags: ["Orders"],
                summary: "Fulfill order items",
                security: [{ bearerAuth: [] }],
                description: "Đánh dấu items là fulfilled (warehouse action). Deducts từ reserved → sold ATOMIC.",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/FulfillItemInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/{order_id}/shipment": {
            post: {
                tags: ["Orders"],
                summary: "Record shipment",
                security: [{ bearerAuth: [] }],
                description: "Ghi nhận shipment info (carrier + tracking code). Transitions PROCESSING → SHIPPED.",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RecordShipmentInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/orders/{order_id}/deliver": {
            post: {
                tags: ["Orders"],
                summary: "Confirm delivery",
                security: [{ bearerAuth: [] }],
                description: "Xác nhận giao hàng. Transitions SHIPPED → DELIVERED.",
                parameters: [
                    {
                        in: "path",
                        name: "order_id",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/OrderDetailResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // ===== PAYMENT WEBHOOKS =====

        "/api/v1/payments/vnpay-return": {
            get: {
                tags: ["Payments"],
                summary: "VNPay return URL (display only)",
                security: [],
                description: "⚠️ CRITICAL: This is a browser redirect endpoint, NOT a data update endpoint. This is a display only UI redirect based on response code. DO NOT trust for database updates. Source of truth is IPN webhook (/webhook/vnpay). Returns redirect to /checkout/success or /checkout/failed.",
                parameters: [
                    {
                        name: "vnp_ResponseCode",
                        in: "query",
                        required: true,
                        schema: { type: "string", example: "00" },
                        description: "Response code from VNPay (00=success, other=failed)",
                    },
                    {
                        name: "vnp_OrderInfo",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Order reference/ID",
                    },
                    {
                        name: "vnp_TxnRef",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Transaction reference",
                    },
                ],
                responses: {
                    "302": {
                        description: "Redirect to frontend (success or failed page)",
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/webhook/vnpay": {
            post: {
                tags: ["Payments"],
                summary: "VNPay IPN webhook",
                security: [],
                description: "VNPay IPN webhook nhận thông báo thanh toán. Không cần auth. Verify bằng HMAC-SHA256.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VNPayWebhookInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK (webhook always 200)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/WebhookResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/webhook/stripe": {
            post: {
                tags: ["Payments"],
                summary: "Stripe webhook",
                security: [],
                description: "Stripe sends webhook event. Signature in x-stripe-signature header. Always responds 200.",
                parameters: [
                    {
                        in: "header",
                        name: "x-stripe-signature",
                        required: true,
                        schema: { type: "string" },
                        description: "Stripe webhook signature (format: t=timestamp,v1=signature)",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                description: "Stripe webhook event",
                                properties: {
                                    id: { type: "string", example: "evt_1234567890" },
                                    type: { type: "string", example: "payment_intent.succeeded" },
                                    data: {
                                        type: "object",
                                        properties: {
                                            object: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string", example: "pi_1234567890" },
                                                    amount: { type: "integer", example: 1620000 },
                                                    status: { type: "string", example: "succeeded" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/WebhookResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/webhook/paypal": {
            post: {
                tags: ["Payments"],
                summary: "PayPal webhook",
                security: [],
                description: "PayPal sends webhook event. No authentication. Always responds 200.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                description: "PayPal webhook event",
                                properties: {
                                    id: { type: "string", example: "WH-123456789" },
                                    event_type: { type: "string", example: "CHECKOUT.ORDER.COMPLETED" },
                                    resource: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string", example: "EC-123456789" },
                                            status: { type: "string", example: "APPROVED" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/WebhookResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments": {
            post: {
                tags: ["Payments"],
                summary: "Create payment",
                security: [{ bearerAuth: [] }],
                description: "Khởi tạo thanh toán cho đơn hàng. Số tiền lấy từ order.total_amount, không cho client sửa.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreatePaymentInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CreatePaymentResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            get: {
                tags: ["Payments"],
                summary: "List payments",
                security: [{ bearerAuth: [] }],
                description: "Lấy lịch sử thanh toán của user hoặc admin. Hỗ trợ filter theo trạng thái, provider, thời gian.",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                    {
                        in: "query",
                        name: "status",
                        schema: { type: "string", example: "paid,pending" },
                        description: "Filter by status (comma-separated: pending,paid,failed)",
                    },
                    {
                        in: "query",
                        name: "provider",
                        schema: { type: "string", enum: ["vnpay", "stripe", "paypal"] },
                        description: "Filter by payment provider",
                    },
                    {
                        in: "query",
                        name: "date_from",
                        schema: { type: "string", format: "date" },
                        description: "Filter from date (ISO date)",
                    },
                    {
                        in: "query",
                        name: "date_to",
                        schema: { type: "string", format: "date" },
                        description: "Filter to date (ISO date)",
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/{paymentId}": {
            get: {
                tags: ["Payments"],
                summary: "Get payment details",
                security: [{ bearerAuth: [] }],
                description: "Get payment details. Customer can only see their own payments. Admin sees all.",
                parameters: [
                    {
                        in: "path",
                        name: "paymentId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/orders/{orderId}/payment": {
            get: {
                tags: ["Payments"],
                summary: "Get payment for order",
                security: [{ bearerAuth: [] }],
                description: "Get payment details for a specific order.",
                parameters: [
                    {
                        in: "path",
                        name: "orderId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/{paymentId}/retry": {
            post: {
                tags: ["Payments"],
                summary: "Retry failed payment",
                security: [{ bearerAuth: [] }],
                description: "thử lại thanh toán thất bại. Reset trạng thái về pending và tạo payment URL mới.",
                parameters: [
                    {
                        in: "path",
                        name: "paymentId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RetryPaymentResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/payments/{paymentId}/cancel": {
            post: {
                tags: ["Payments"],
                summary: "Cancel pending payment",
                security: [{ bearerAuth: [] }],
                description: "hủy thanh toán đang pending. Hoàn lại tồn kho nếu cần.",
                parameters: [
                    {
                        in: "path",
                        name: "paymentId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CancelPaymentInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CancelPaymentResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/payments": {
            get: {
                tags: ["Payments"],
                summary: "Admin: List all payments",
                security: [{ bearerAuth: [] }],
                description: "Admin only. List all payments with comprehensive filtering.",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                    {
                        in: "query",
                        name: "status",
                        schema: { type: "string", example: "paid,failed" },
                        description: "Filter by status (comma-separated)",
                    },
                    {
                        in: "query",
                        name: "verification_status",
                        schema: { type: "string", enum: ["pending", "verified", "failed"] },
                        description: "Filter by webhook verification status",
                    },
                    {
                        in: "query",
                        name: "provider",
                        schema: { type: "string", enum: ["vnpay", "stripe", "paypal"] },
                    },
                    {
                        in: "query",
                        name: "date_from",
                        schema: { type: "string", format: "date" },
                    },
                    {
                        in: "query",
                        name: "date_to",
                        schema: { type: "string", format: "date" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/payments/stats": {
            get: {
                tags: ["Payments"],
                summary: "Admin: Payment statistics",
                security: [{ bearerAuth: [] }],
                description: "Admin: thống kê thanh toán (doanh thu, breakdown theo trạng thái, provider).",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentStatsResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/payments/{paymentId}/verify": {
            post: {
                tags: ["Payments"],
                summary: "Admin: Manually verify payment",
                security: [{ bearerAuth: [] }],
                description: "Admin only. Manually verify webhook signature for debugging.",
                parameters: [
                    {
                        in: "path",
                        name: "paymentId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                paymentId: { type: "string" },
                                                verification_status: { type: "string", enum: ["pending", "verified", "failed"] },
                                                status: { type: "string", enum: ["pending", "paid", "failed"] },
                                                message: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/payments/{paymentId}": {
            delete: {
                tags: ["Payments"],
                summary: "Admin: Soft-delete payment",
                security: [{ bearerAuth: [] }],
                description: "Admin: soft-delete payment (giữ audit trail, không xóa cứng).",
                parameters: [
                    {
                        in: "path",
                        name: "paymentId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaymentResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/validate": {
            post: {
                tags: ["Discounts"],
                summary: "Validate discount code at checkout",
                security: [],
                description: "Validate và tính toán discount amount (public endpoint, không cần auth).",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ValidateDiscountInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ValidateDiscountResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/applicable": {
            post: {
                tags: ["Discounts"],
                summary: "Get applicable discounts for cart",
                security: [],
                description: "Get danh sách discount có thể áp dụng cho giỏ hàng - applicable for cart items",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    cartSubtotal: {
                                        type: "number",
                                        minimum: 0,
                                        example: 10000000,
                                    },
                                    cartItems: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                product_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                                variant_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                                category_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                            },
                                        },
                                    },
                                },
                                required: ["cartSubtotal", "cartItems"],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountsListResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts": {
            post: {
                tags: ["Discounts"],
                summary: "Create discount",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateDiscountInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            get: {
                tags: ["Discounts"],
                summary: "List discounts",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
                    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                    { in: "query", name: "status", schema: { type: "string", enum: ["active", "inactive", "paused", "expired"] } },
                    { in: "query", name: "type", schema: { type: "string", enum: ["percent", "fixed"] } },
                    { in: "query", name: "search", schema: { type: "string", description: "Search by code" } },
                    { in: "query", name: "sortBy", schema: { type: "string", enum: ["created_at", "expiry_date", "usage_count", "-created_at", "-expiry_date", "-usage_count"], default: "-created_at" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/{discountId}": {
            get: {
                tags: ["Discounts"],
                summary: "Get discount detail",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            patch: {
                tags: ["Discounts"],
                summary: "Update discount",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateDiscountInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
            delete: {
                tags: ["Discounts"],
                summary: "Delete discount (soft delete)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Discount deleted successfully" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/{discountId}/revoke": {
            post: {
                tags: ["Discounts"],
                summary: "Revoke discount (mark inactive)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/{discountId}/duplicate": {
            post: {
                tags: ["Discounts"],
                summary: "Duplicate discount",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                    { in: "query", name: "new_code", required: true, schema: { type: "string", minLength: 3, maxLength: 20 } },
                ],
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/{discountId}/stats": {
            get: {
                tags: ["Discounts"],
                summary: "Get discount usage statistics",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "path", name: "discountId", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                discount_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                                                code: { type: "string" },
                                                usage_count: { type: "integer" },
                                                usage_limit: { type: "integer" },
                                                usage_percentage: { type: "number" },
                                                total_discount_amount: { type: "number" },
                                                unique_users: { type: "integer" },
                                                first_used: { type: "string", format: "date-time", nullable: true },
                                                last_used: { type: "string", format: "date-time", nullable: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/bulk/import": {
            post: {
                tags: ["Discounts"],
                summary: "Bulk create discounts",
                security: [{ bearerAuth: [] }],
                description: "Import nhiều discount từ mảng / CSV bulk. Trả về created vs failed.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BulkCreateDiscountInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BulkCreateDiscountResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/discounts/near-expiry": {
            get: {
                tags: ["Discounts"],
                summary: "Get discounts expiring soon",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { in: "query", name: "days", schema: { type: "integer", minimum: 1, default: 7 }, description: "Expiring within N days" },
                    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/admin/discounts/stats": {
            get: {
                tags: ["Discounts"],
                summary: "Get discount statistics (admin dashboard)",
                security: [{ bearerAuth: [] }],
                description: "Get discount statistics dashboard - admin view of all campaigns",
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/DiscountStatsResponseWrapper" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // SHIPMENT ROUTES
        "/api/v1/shipments/track/{tracking_code}": {
            get: {
                tags: ['Shipments'],
                summary: 'Track shipment by tracking code',
                description: 'Track shipment công khai (không cần xác thực). Lấy thông tin vận chuyển theo tracking code.',
                security: [],
                parameters: [
                    {
                        name: 'tracking_code',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Carrier tracking code'
                    }
                ],
                responses: {
                    200: {
                        description: 'Shipment tracking information',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/TrackingDTO'  // ← Change from TrackingResponse
                                }
                            }
                        }
                    },
                    404: { $ref: '#/components/responses/NotFound' }
                }
            }
        },

        "/api/v1/shipments/webhook/{carrier}": {
            post: {
                tags: ['Shipments'],
                summary: 'Carrier webhook for status updates',
                description: 'Carrier webhook để nhận cập nhật vận chuyển. Không cần xác thực.',  // ← ADD THIS
                security: [],
                parameters: [
                    {
                        name: 'carrier',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                            enum: ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER']
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['tracking_code', 'status'],
                                properties: {
                                    tracking_code: { type: 'string' },
                                    status: { type: 'string' },
                                    signature: { type: 'string' },
                                    carrier_details: { type: 'object' },
                                    timestamp: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Webhook processed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}": {
            get: {
                tags: ['Shipments'],
                summary: 'Get shipment details',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                responses: {
                    200: {
                        description: 'Shipment details',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'  // ← Use $ref directly
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    404: { $ref: '#/components/responses/NotFound' }
                }
            }
        },

        "/api/v1/orders/{orderId}/shipments": {
            get: {
                tags: ['Shipments'],
                summary: 'Get shipments for order',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'orderId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                responses: {
                    200: {
                        description: 'Order shipments',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentsListResponse'  // ← Use $ref directly
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },

        "/api/v1/shipments": {
            get: {
                tags: ['Shipments'],
                summary: 'List user shipments',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', default: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', default: 20, maximum: 100 }
                    },
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string' },
                        description: 'Comma-separated status values'
                    },
                    {
                        name: 'carrier',
                        in: 'query',
                        schema: { type: 'string', enum: ['GHN', 'GHTK', 'JT', 'GRAB', 'BEST', 'OTHER'] }
                    },
                    {
                        name: 'date_from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'date_to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    }
                ],
                responses: {
                    200: {
                        description: 'List of shipments',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentsListResponse'  // ← Use $ref directly
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            },
            post: {
                tags: ['Shipments'],
                summary: 'Create shipment (admin only)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/CreateShipmentInput'  // ← Use $ref directly
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Shipment created',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'  // ← Use $ref directly
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}/status": {
            patch: {
                tags: ['Shipments'],
                summary: 'Update shipment status (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/UpdateShipmentStatusInput'  // ← Use $ref directly
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Status updated',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    409: { $ref: '#/components/responses/Conflict' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}/failure": {
            patch: {
                tags: ['Shipments'],
                summary: 'Record delivery failure (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/RecordShipmentFailureInput'  // ← Use $ref directly
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Failure recorded',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}/retry": {
            post: {
                tags: ['Shipments'],
                summary: 'Retry failed shipment',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                responses: {
                    200: {
                        description: 'Shipment retry initiated',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    409: { $ref: '#/components/responses/Conflict' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}/cancel": {
            patch: {
                tags: ['Shipments'],
                summary: 'Cancel shipment',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/CancelShipmentInput'  // ← Use $ref directly
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Shipment cancelled',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },

        "/api/v1/shipments/{shipmentId}/confirm-delivery": {
            post: {
                tags: ['Shipments'],
                summary: 'Confirm delivery (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'shipmentId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    }
                ],
                responses: {
                    200: {
                        description: 'Delivery confirmed',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentResponse'
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    409: { $ref: '#/components/responses/Conflict' }
                }
            }
        },

        "/api/v1/admin/shipments": {
            get: {
                tags: ['Shipments'],
                summary: 'List all shipments (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', default: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', default: 20 }
                    },
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'carrier',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'user_id',
                        in: 'query',
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    },
                    {
                        name: 'order_id',
                        in: 'query',
                        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
                    },
                    {
                        name: 'date_from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'date_to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    }
                ],
                responses: {
                    200: {
                        description: 'All shipments',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ShipmentsListResponse'
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' }
                }
            }
        },

        "/api/v1/admin/shipments/stats": {
            get: {
                tags: ['Shipments'],
                summary: 'Get shipment statistics (admin only)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Shipment statistics',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'object' }
                                    }
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },

        // Review routes
        "/api/v1/reviews/product/{productId}": {
            get: {
                tags: ["Reviews"],
                summary: "Get product reviews (public)",
                security: [],
                description: "Lấy danh sách review cho sản phẩm (chỉ approved reviews). Sắp xếp theo helpful_count rồi created_at.",
                parameters: [
                    {
                        in: "path",
                        name: "productId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                        description: "Product ID",
                    },
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewsListResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/variant/{variantId}": {
            get: {
                tags: ["Reviews"],
                summary: "Get variant reviews (public)",
                security: [],
                description: "Lấy danh sách review cho variant (chỉ approved reviews).",
                parameters: [
                    {
                        in: "path",
                        name: "variantId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewsListResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/{reviewId}": {
            get: {
                tags: ["Reviews"],
                summary: "Get review detail (public)",
                security: [],
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },

            put: {
                tags: ["Reviews"],
                summary: "Update own review",
                security: [{ bearerAuth: [] }],
                description: "Cập nhật review của chính mình. Edit sẽ reset approval status.",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateReviewInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },

            delete: {
                tags: ["Reviews"],
                summary: "Delete own review",
                security: [{ bearerAuth: [] }],
                description: "soft delete own review",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Review deleted successfully" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews": {
            post: {
                tags: ["Reviews"],
                summary: "Create review",
                security: [{ bearerAuth: [] }],
                description: "Tạo review cho sản phẩm từ đơn hàng đã hoàn thành. Chỉ verified purchases được phép. Ban đầu pending approval.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateReviewInput" },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/{reviewId}/helpful": {
            post: {
                tags: ["Reviews"],
                summary: "Mark review as helpful/unhelpful",
                security: [{ bearerAuth: [] }],
                description: "toggle helpful status (idempotent)",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/MarkHelpfulInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Vote recorded successfully" },
                                    },
                                },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/{reviewId}/flag": {
            post: {
                tags: ["Reviews"],
                summary: "Flag review for moderation",
                security: [{ bearerAuth: [] }],
                description: "flag review as inappropriate",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/FlagReviewInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/user/my-reviews": {
            get: {
                tags: ["Reviews"],
                summary: "Get my reviews",
                security: [{ bearerAuth: [] }],
                description: "get own reviews including pending approval",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/admin/pending": {
            get: {
                tags: ["Reviews"],
                summary: "Get pending reviews (admin)",
                security: [{ bearerAuth: [] }],
                description: "Lấy danh sách review đang chờ duyệt. Admin moderation endpoint.",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AdminReviewsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/admin/flagged": {
            get: {
                tags: ["Reviews"],
                summary: "Get flagged reviews (admin)",
                security: [{ bearerAuth: [] }],
                description: "get flagged reviews for admin moderation",
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AdminReviewsListResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/{reviewId}/approve": {
            post: {
                tags: ["Reviews"],
                summary: "Approve review (admin)",
                security: [{ bearerAuth: [] }],
                description: "approve review for public visibility",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        "/api/v1/reviews/{reviewId}/reject": {
            post: {
                tags: ["Reviews"],
                summary: "Reject review (admin)",
                security: [{ bearerAuth: [] }],
                description: "reject review with reason",
                parameters: [
                    {
                        in: "path",
                        name: "reviewId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RejectReviewInput" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ReviewResponse" },
                            },
                        },
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" },
                },
            },
        },

        // Banners
        "/api/v1/banners/location/{location}": {
            get: {
                tags: ["Banners"],
                summary: "Get active banners by location (Public)",
                description: "public: retrieve currently active banners for a specific location. No authentication required. Returns only banners where start_at ≤ now < end_at.",
                operationId: "getActiveBannersByLocation",
                security: [],
                parameters: [
                    {
                        name: "location",
                        in: "path",
                        required: true,
                        schema: {
                            type: "string",
                            enum: ["homepage_top", "homepage_middle", "homepage_bottom", "category_page"]
                        },
                        description: "Banner location on website"
                    }
                ],
                responses: {
                    "200": {
                        description: "List of active banners for location",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannersListResponse" }
                            }
                        }
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/banners/{id}": {
            get: {
                tags: ["Banners"],
                summary: "Get banner by ID (Public)",
                description: "Retrieve a single banner by ID. Returns banner regardless of active status.",
                operationId: "getBannerById",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Banner details",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannerResponse" }
                            }
                        }
                    },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            patch: {
                tags: ["Banners"],
                summary: "Update banner (Admin)",
                description: "Update banner details. All fields optional (partial update).",
                operationId: "updateBanner",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateBannerInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Banner updated",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannerResponse" }
                            }
                        }
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            delete: {
                tags: ["Banners"],
                summary: "Delete banner (Admin)",
                description: "Soft delete a banner (marks as deleted but retains record).",
                operationId: "deleteBanner",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Banner deleted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Banner deleted successfully" }
                                    }
                                }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/banners/deleted": {
            get: {
                tags: ["Banners"],
                summary: "Get deleted banners (Admin)",
                description: "admin only: Retrieve deleted banners for recovery. Shows audit trail with deleted_at timestamp.",
                operationId: "getDeletedBanners",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "List of deleted banners",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannersListResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/banners": {
            get: {
                tags: ["Banners"],
                summary: "Get all banners (Admin)",
                description: "admin only: Retrieve all non-deleted banners (active + scheduled). Optional location filter.",
                operationId: "getAllBanners",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "location",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["homepage_top", "homepage_middle", "homepage_bottom", "category_page"]
                        },
                        description: "Optional filter by location"
                    }
                ],
                responses: {
                    "200": {
                        description: "List of all banners",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannersListResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            post: {
                tags: ["Banners"],
                summary: "Create banner (Admin)",
                description: "admin only: Create a new banner. Validation done by middleware. User ID from JWT for audit trail.",
                operationId: "createBanner",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateBannerInput" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Banner created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannerResponse" }
                            }
                        }
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "409": { $ref: "#/components/responses/Conflict" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/banners/{id}/restore": {
            post: {
                tags: ["Banners"],
                summary: "Restore deleted banner (Admin)",
                description: "admin only: restore a previously deleted banner. User ID from JWT for audit trail.",
                operationId: "restoreBanner",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Banner restored",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BannerResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "403": { $ref: "#/components/responses/Forbidden" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        // Announcements
        '/api/v1/announcements': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy thông báo hoạt động',
                description: "public: retrieve active announcements (đang hoạt động, start_at ≤ now < end_at), sắp xếp theo priority",
                parameters: [
                    {
                        in: 'query',
                        name: 'target',
                        schema: {
                            type: 'string',
                            enum: ['all', 'user', 'admin', 'guest']
                        },
                        description: 'Lọc theo đối tượng mục tiêu (tùy chọn)'
                    }
                ],
                responses: {
                    200: {
                        description: 'Danh sách thông báo hoạt động',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementsListResponse'
                                }
                            }
                        }
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            },
            post: {
                tags: ['Announcements'],
                summary: 'Tạo thông báo',
                description: 'Admin only: Tạo thông báo mới',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/CreateAnnouncementInput'
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Thông báo được tạo thành công',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementResponse'
                                }
                            }
                        }
                    },
                    400: {
                        $ref: '#/components/responses/BadRequest'
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/{id}': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy thông báo theo ID',
                description: 'Public: Lấy chi tiết thông báo (active hoặc không)',
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: {
                            type: 'string',
                            pattern: '^[a-fA-F0-9]{24}$'
                        },
                        description: 'Announcement ID'
                    }
                ],
                responses: {
                    200: {
                        description: 'Chi tiết thông báo',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementResponse'
                                }
                            }
                        }
                    },
                    404: {
                        $ref: '#/components/responses/NotFound'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            },
            put: {
                tags: ['Announcements'],
                summary: 'Cập nhật thông báo',
                description: 'Admin only: Cập nhật thông báo (hỗ trợ partial update)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: {
                            type: 'string',
                            pattern: '^[a-fA-F0-9]{24}$'
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/UpdateAnnouncementInput'
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Thông báo được cập nhật',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementResponse'
                                }
                            }
                        }
                    },
                    400: {
                        $ref: '#/components/responses/BadRequest'
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    404: {
                        $ref: '#/components/responses/NotFound'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            },
            delete: {
                tags: ['Announcements'],
                summary: 'Xóa thông báo',
                description: 'Admin only: Soft delete thông báo (có thể restore lại)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: {
                            type: 'string',
                            pattern: '^[a-fA-F0-9]{24}$'
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Thông báo được xóa',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: {
                                            type: 'boolean',
                                            example: true
                                        },
                                        message: {
                                            type: 'string',
                                            example: 'Announcement deleted successfully'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    404: {
                        $ref: '#/components/responses/NotFound'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/admin/all': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy tất cả thông báo',
                description: 'Admin only: Lấy tất cả thông báo (active + scheduled)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'target',
                        schema: {
                            type: 'string',
                            enum: ['all', 'user', 'admin', 'guest']
                        },
                        description: 'Lọc theo target (tùy chọn)'
                    },
                    {
                        in: 'query',
                        name: 'type',
                        schema: {
                            type: 'string',
                            enum: ['info', 'warning', 'promotion', 'system', 'urgent']
                        },
                        description: 'Lọc theo type (tùy chọn)'
                    },
                    {
                        in: 'query',
                        name: 'activeOnly',
                        schema: {
                            type: 'boolean',
                            default: false
                        },
                        description: 'Chỉ lấy thông báo đang hoạt động (tùy chọn)'
                    },
                    {
                        in: 'query',
                        name: 'page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Danh sách tất cả thông báo',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementsListResponse'
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/admin/scheduled': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy thông báo scheduled',
                description: 'Admin only: Lấy thông báo chưa bắt đầu (start_at > now)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Danh sách thông báo scheduled',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementsListResponse'
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/admin/expired': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy thông báo expired',
                description: 'Admin only: Lấy thông báo đã kết thúc (end_at <= now)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Danh sách thông báo expired',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementsListResponse'
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/admin/deleted': {
            get: {
                tags: ['Announcements'],
                summary: 'Lấy thông báo đã xóa',
                description: 'Admin only: Lấy danh sách thông báo đã xóa (để recover)',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Danh sách thông báo đã xóa',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/AnnouncementsListResponse'
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        '/api/v1/announcements/{id}/restore': {
            post: {
                tags: ['Announcements'],
                summary: 'Khôi phục thông báo',
                description: 'Admin only: Khôi phục thông báo đã xóa',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: {
                            type: 'string',
                            pattern: '^[a-fA-F0-9]{24}$'
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'Thông báo được khôi phục',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: {
                                            type: 'boolean',
                                            example: true
                                        },
                                        data: {
                                            $ref: '#/components/schemas/Announcement'
                                        },
                                        message: {
                                            type: 'string',
                                            example: 'Announcement restored successfully'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        $ref: '#/components/responses/Unauthorized'
                    },
                    403: {
                        $ref: '#/components/responses/Forbidden'
                    },
                    404: {
                        $ref: '#/components/responses/NotFound'
                    },
                    500: {
                        $ref: '#/components/responses/InternalError'
                    }
                }
            }
        },

        // ===== SHOP INFO PATHS =====
        '/api/v1/shop-info': {
            get: {
                tags: ['Shop Info'],
                summary: 'Get shop information (PUBLIC)',
                description: 'PUBLIC endpoint. Retrieve complete shop information including contact, hours, and social links. No authentication required.',
                security: [],
                responses: {
                    '200': {
                        description: 'Shop information retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ShopInfoResponse' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            },
            post: {
                tags: ['Shop Info'],
                summary: 'Create shop information (ADMIN ONLY)',
                description: 'ADMIN ONLY endpoint. Initialize shop information. Called once during setup. Prevents duplicate creation.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateShopInfoInput' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Shop information created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ShopInfoResponse' }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '409': { $ref: '#/components/responses/Conflict' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            },
            patch: {
                tags: ['Shop Info'],
                summary: 'Update shop information (ADMIN ONLY)',
                description: 'ADMIN ONLY endpoint. partial updates allowed. Only provided fields are updated.', security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateShopInfoInput' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Shop information updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ShopInfoResponse' }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/contact': {
            get: {
                tags: ['Shop Info'],
                summary: 'Get contact information (PUBLIC)',
                description: 'PUBLIC endpoint. Retrieve contact information only (lighter DTO for contact forms).',
                security: [],
                responses: {
                    '200': {
                        description: 'Contact information retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ContactInfoResponse' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/hours': {
            get: {
                tags: ['Shop Info'],
                summary: 'Get working hours (PUBLIC)',
                description: 'PUBLIC endpoint. Retrieve shop working hours for storefront widget.',
                security: [],
                responses: {
                    '200': {
                        description: 'Working hours retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/WorkingHoursResponse' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/social': {
            get: {
                tags: ['Shop Info'],
                summary: 'Get social media links (PUBLIC)',
                description: 'PUBLIC endpoint. Retrieve social media links for footer embeds.',
                security: [],
                responses: {
                    '200': {
                        description: 'Social links retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SocialLinksResponse' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/is-open': {
            get: {
                tags: ['Shop Info'],
                summary: 'Check if shop is currently open (PUBLIC)',
                description: 'PUBLIC endpoint. real-time status check based on working hours. Returns { is_open: boolean }.',
                security: [],
                responses: {
                    '200': {
                        description: 'Shop open status',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/IsOpenResponseWrapper' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/next-opening': {
            get: {
                tags: ['Shop Info'],
                summary: 'Get next opening time (PUBLIC)',
                description: 'PUBLIC endpoint. Returns next opening time. Shows "We open at..." message with next opening date and time. Returns null if shop doesn\'t have gaps.',
                security: [],
                responses: {
                    '200': {
                        description: 'Next opening time retrieved',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/NextOpeningTimeResponse' }
                            }
                        }
                    },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        '/api/v1/shop-info/status': {
            patch: {
                tags: ['Shop Info'],
                summary: 'Toggle shop status (ADMIN ONLY)',
                description: 'ADMIN ONLY endpoint. Activate/deactivate shop temporarily (useful for maintenance mode).',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ToggleShopStatusInput' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Shop status updated',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ShopInfoResponse' }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                    '404': { $ref: '#/components/responses/NotFound' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        },

        // Notifications
        "/api/v1/notifications/unread-count": {
            get: {
                tags: ["Notifications"],
                summary: "Get unread notification count",
                description: "Lấy số lượng thông báo chưa đọc của người dùng",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UnreadCountResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/notifications/mark-all-read": {
            patch: {
                tags: ["Notifications"],
                summary: "Mark all notifications as read",
                description: "Đánh dấu tất cả thông báo của người dùng là đã đọc",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/MarkAllAsReadResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/notifications/bulk/mark-read": {
            patch: {
                tags: ["Notifications"],
                summary: "Mark multiple notifications as read",
                description: "Đánh dấu bulk thông báo (danh sách nhiều) là đã đọc",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BulkMarkAsReadInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BulkMarkAsReadResponse" }
                            }
                        }
                    },
                    "400": { $ref: "#/components/responses/BadRequest" },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/notifications": {
            get: {
                tags: ["Notifications"],
                summary: "Get paginated notifications",
                description: "Lấy danh sách thông báo với pagination, hỗ trợ lọc theo type/priority",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        schema: { type: "integer", minimum: 1, default: 1 }
                    },
                    {
                        in: "query",
                        name: "limit",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 10 }
                    },
                    {
                        in: "query",
                        name: "type",
                        schema: { type: "string", enum: ["order", "system", "promotion"] }
                    },
                    {
                        in: "query",
                        name: "priority",
                        schema: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    {
                        in: "query",
                        name: "unread_only",
                        schema: { type: "boolean", default: false }
                    }
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/NotificationsListResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            delete: {
                tags: ["Notifications"],
                summary: "Delete all notifications",
                description: "xóa tất cả thông báo của người dùng (soft delete)",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                deleted_count: { type: "integer", example: 15 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/notifications/{notificationId}": {
            get: {
                tags: ["Notifications"],
                summary: "Get single notification by ID",
                description: "Lấy chi tiết một thông báo theo ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "notificationId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/NotificationResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            },
            delete: {
                tags: ["Notifications"],
                summary: "Delete single notification",
                description: "xóa một thông báo",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "notificationId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Notification deleted successfully" }
                                    }
                                }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        "/api/v1/notifications/{notificationId}/read": {
            patch: {
                tags: ["Notifications"],
                summary: "Mark single notification as read",
                description: "Đánh dấu một thông báo là đã đọc",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "notificationId",
                        required: true,
                        schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                    }
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/NotificationResponse" }
                            }
                        }
                    },
                    "401": { $ref: "#/components/responses/Unauthorized" },
                    "404": { $ref: "#/components/responses/NotFound" },
                    "500": { $ref: "#/components/responses/InternalError" }
                }
            }
        },

        // Chatbots
        "/api/v1/chats/sessions": {
            post: {
                tags: ["Chats"],
                summary: "Tạo phiên chat mới",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string", example: "Tư vấn túi lưới" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: "Tạo session thành công",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ChatSessionResponse" }
                            }
                        }
                    },
                    401: { $ref: "#/components/responses/Unauthorized" }
                }
            }
        },
        "/api/v1/chats/message": {
            post: {
                tags: ["Chats"],
                summary: "Gửi tin nhắn cho AI trợ lý",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["message", "session_id"],
                                properties: {
                                    message: { type: "string", example: "Túi bọc trái na giá bao nhiêu?" },
                                    session_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "AI phản hồi thành công",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ChatMessageResponse" }
                            }
                        }
                    },
                    404: { $ref: "#/components/responses/NotFound" },
                    503: { $ref: "#/components/responses/InternalError" }
                }
            }
        },
    },
};

module.exports = swaggerSpec;