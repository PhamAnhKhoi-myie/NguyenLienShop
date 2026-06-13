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
            description: "Register, log in, refresh access token, log out.",
        },
        {
            name: "Users",
            description: "Manage user information.",
        },
        {
            name: "User Addresses",
            description: "Manage delivery addresses.",
        },
        {
            name: "Locations",
            description: "Danh muc tinh/thanh va phuong/xa Viet Nam.",
        },
        {
            name: "Categories",
            description: "Manage product categories.",
        },
        {
            name: "Products",
            description: "Product management.",
        },
        {
            name: "Variants",
            description: "Manage product variations.",
        },
        {
            name: "Variant Units",
            description: "Manages the units sold of the variant.",
        },
        {
            name: "Carts",
            description: "Manage shopping cart.",
        },
        {
            name: "Orders",
            description: "Order management.",
        },
        {
            name: "Payments",
            description: "Payment management.",
        },
        {
            name: "Discounts",
            description: "Manage discount codes / vouchers.",
        },
        {
            name: "Shipments",
            description: "Transport management.",
        },
        {
            name: "Reviews",
            description: "Manage product reviews.",
        },
        {
            name: "Banners",
            description: "Banner management.",
        },
        {
            name: "Blogs",
            description: "Quan ly tin tuc, bai viet va huong dan.",
        },
        {
            name: "Announcements",
            description: "Manage notifications.",
        },
        {
            name: "Shop Info",
            description: "Manage store information.",
        },
        {
            name: "Notifications",
            description: "Manage notifications for users.",
        },
        {
            name: "Chats",
            description: "Gemini integrated AI assistant chatbot.",
        },
        {
            name: "Audit Logs",
            description: "Look up audit logs by domain.",
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
