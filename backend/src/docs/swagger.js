const securitySchemes = require("./components/securitySchemes");
const responses = require("./components/responses");
const schemas = require("./components/schemas");
const paths = require("./paths");

const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "NguyenLien API",
        version: "1.0.0",
        description: "NguyenLienShop Backend API Documentation.",
    },
    servers: [
        {
            url: "http://localhost:5000/api/v1",
            description: "Local API",
        },
    ],
    tags: [
        {
            name: "Auth",
            description: "Đăng ký, đăng nhập, refresh access token, đăng xuất.",
        },
        {
            name: "Users",
            description: "Quản lý thông tin người dùng.",
        },
        {
            name: "User Addresses",
            description: "Quản lý địa chỉ giao hàng.",
        },
        {
            name: "Categories",
            description: "Quản lý danh mục sản phẩm.",
        },
        {
            name: "Products",
            description: "Quản lý sản phẩm.",
        },
        {
            name: "Variants",
            description: "Quản lý biến thể sản phẩm.",
        },
        {
            name: "Variant Units",
            description: "Quản lý đơn vị bán của biến thể.",
        },
        {
            name: "Carts",
            description: "Quản lý giỏ hàng.",
        },
        {
            name: "Orders",
            description: "Quản lý đơn hàng.",
        },
        {
            name: "Payments",
            description: "Quản lý thanh toán.",
        },
        {
            name: "Discounts",
            description: "Quản lý mã giảm giá / voucher.",
        },
        {
            name: "Shipments",
            description: "Quản lý vận chuyển.",
        },
        {
            name: "Reviews",
            description: "Quản lý đánh giá sản phẩm.",
        },
        {
            name: "Banners",
            description: "Quản lý banner.",
        },
        {
            name: "Announcements",
            description: "Quản lý thông báo.",
        },
        {
            name: "Shop Info",
            description: "Quản lý thông tin cửa hàng.",
        },
        {
            name: "Notifications",
            description: "Quản lý thông báo cho người dùng.",
        },
        {
            name: "Chats",
            description: "Chatbot trợ lý AI tích hợp Gemini.",
        },
        {
            name: "Audit Logs",
            description: "Tra cứu audit logs theo domain.",
        },
        {
            name: "Uploads",
            description: "Upload file/image.",
        },
    ],
    components: {
        securitySchemes,
        responses,
        schemas,
    },
    paths,
};

module.exports = swaggerSpec;
