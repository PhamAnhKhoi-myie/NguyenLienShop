const { swaggerSpec } = require("./helpers");

describe("swagger spec shell", () => {
    it("defines OpenAPI metadata", () => {
        expect(swaggerSpec.openapi).toBe("3.0.0");
        expect(swaggerSpec.info).toMatchObject({
            title: "NguyenLien API",
            version: "1.0.0",
            description: "NguyenLienShop Backend API Documentation.",
        });
    });

    it("keeps API version in the server URL", () => {
        expect(swaggerSpec.servers).toEqual([
            {
                url: "http://localhost:5000/api/v1",
                description: "Local API",
            },
        ]);
    });

    it("defines the expected top-level tags", () => {
        expect(swaggerSpec.tags.map((tag) => tag.name)).toEqual([
            "Auth",
            "Users",
            "User Addresses",
            "Categories",
            "Products",
            "Variants",
            "Variant Units",
            "Carts",
            "Orders",
            "Payments",
            "Discounts",
            "Shipments",
            "Reviews",
            "Banners",
            "Announcements",
            "Shop Info",
            "Notifications",
            "Chats",
            "Audit Logs",
            "Uploads",
        ]);
    });
});
