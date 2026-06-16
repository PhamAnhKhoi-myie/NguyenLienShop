const mongoose = require("mongoose");

const Category = require("../modules/categories/category.model");
const Product = require("../modules/products/product.model");
const Variant = require("../modules/products/variant.model");
const VariantUnit = require("../modules/products/variant_unit.model");

const CATEGORY_SLUGS = {
    mango: "tui-bao-trai-xoai",
    pomelo: "tui-bao-trai-buoi",
    guava: "tui-bao-trai-oi",
    dragonFruit: "tui-bao-trai-thanh-long",
    jackfruit: "tui-bao-trai-mit",
    grape: "tui-bao-trai-nho",
    longanLychee: "tui-bao-nhan-vai",
    banana: "tui-bao-trai-chuoi",
    custardApple: "tui-bao-trai-na-mang-cau",
    longVegetable: "tui-bao-rau-cu-qua-dai",
    supplies: "san-pham-khac",
};

const MATERIAL_NAMES_VI = {
    "White non-woven fabric": "Vải không dệt màu trắng",
    "Thick non-woven fabric": "Vải không dệt dày",
    "2-layer non-woven fabric": "Vải không dệt 2 lớp",
    "White plastic mesh": "Lưới nhựa màu trắng",
    "Thick mesh": "Lưới dày",
    "Fine mesh": "Lưới mịn",
    "Yellow kraft paper": "Giấy kraft màu vàng",
    "2-layer kraft paper": "Giấy kraft 2 lớp",
    "White mesh foam": "Xốp lưới màu trắng",
    "Thick mesh foam": "Xốp lưới dày",
};

const productsData = [
    {
        name: "Túi bao trái xoài vải không dệt trắng 20x27cm",
        slug: "tui-bao-trai-xoai-vai-khong-det-trang-20x27cm",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Nguyen Lien",
        short_description: "Túi bao xoài phổ thông có dây rút, phù hợp sử dụng trong vườn xoài.",
        description: "Sản phẩm dùng để bao trái xoài trong vườn, giúp hạn chế côn trùng, bụi bẩn và giảm trầy xước trên vỏ trái. Chất liệu vải không dệt màu trắng, thoáng khí và dễ sử dụng.",
        keywords: ["tui bao xoai", "bao trai xoai", "vai khong det", "tui day rut"],
        base_price: 45000,
        size_a: "20x27cm",
        size_b: "25x30cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 6000,
        stock_b: 4200,
        sold_count: 135,
        rating_avg: 4.7,
        rating_count: 31,
    },
    {
        name: "Túi bao xoài Đài Loan size lớn 25x35cm",
        slug: "tui-bao-trai-xoai-dai-loan-size-lon-25x35cm",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Nguyen Lien",
        short_description: "Túi bao xoài size lớn, phù hợp cho xoài Đài Loan, xoài cát và các giống xoài trái lớn.",
        description: "Dòng túi bao xoài kích thước lớn, dùng cho các giống xoài có trái dài hoặc phát triển mạnh. Phù hợp với vườn sản xuất quy mô nhỏ đến trung bình.",
        keywords: ["tui bao xoai lon", "xoai dai loan", "xoai cat", "tui xoai"],
        base_price: 52000,
        size_a: "25x35cm",
        size_b: "28x38cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 5000,
        stock_b: 3500,
        sold_count: 89,
        rating_avg: 4.6,
        rating_count: 18,
    },
    {
        name: "Túi lưới bao xoài thoáng khí có dây rút",
        slug: "tui-bao-xoai-luoi-thoang-khi-day-rut",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Farm Bag",
        short_description: "Túi lưới bao xoài thoáng khí, thuận tiện quan sát trái.",
        description: "Túi lưới phù hợp khi cần bảo vệ trái nhưng vẫn duy trì độ thông thoáng và dễ quan sát tình trạng trái trong quá trình chăm sóc.",
        keywords: ["tui luoi xoai", "tui bao xoai", "tui thoang khi", "day rut"],
        base_price: 39000,
        size_a: "20x30cm",
        size_b: "25x35cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Thick mesh",
        stock_a: 7200,
        stock_b: 4600,
        sold_count: 76,
        rating_avg: 4.5,
        rating_count: 15,
    },
    {
        name: "Túi giấy vàng bao xoài chống nắng",
        slug: "tui-bao-xoai-giay-vang-chong-nang",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Green Farm",
        short_description: "Túi giấy bao xoài, phù hợp với khu vực có nắng nhiều.",
        description: "Túi giấy giúp che phủ bề mặt trái, phù hợp với các vườn cần hạn chế ánh nắng trực tiếp tác động lên trái trong một số giai đoạn phát triển.",
        keywords: ["tui giay xoai", "bao xoai giay", "chong nang", "tui bao trai"],
        base_price: 48000,
        size_a: "20x28cm",
        size_b: "25x35cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 3000,
        stock_b: 2200,
        sold_count: 42,
        rating_avg: 4.3,
        rating_count: 9,
    },
    {
        name: "Túi bao trái bưởi vải không dệt 30x35cm",
        slug: "tui-bao-trai-buoi-vai-khong-det-30x35cm",
        category_slug: CATEGORY_SLUGS.pomelo,
        brand: "Nguyen Lien",
        short_description: "Túi bao bưởi size lớn, phù hợp sử dụng trong vườn bưởi.",
        description: "Túi bao bưởi giúp bảo vệ trái khỏi côn trùng và hạn chế trầy xước bề mặt vỏ. Kích thước lớn, dễ thao tác khi bao trái trong vườn.",
        keywords: ["tui bao buoi", "bao trai buoi", "tui size lon", "vai khong det"],
        base_price: 68000,
        size_a: "30x35cm",
        size_b: "35x40cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 4200,
        stock_b: 2800,
        sold_count: 116,
        rating_avg: 4.8,
        rating_count: 26,
    },
    {
        name: "Túi bao bưởi da xanh size lớn",
        slug: "tui-bao-buoi-da-xanh-size-dai",
        category_slug: CATEGORY_SLUGS.pomelo,
        brand: "Nguyen Lien",
        short_description: "Túi bao bưởi da xanh size lớn, phù hợp với các loại trái lớn.",
        description: "Sản phẩm phù hợp cho bưởi da xanh, bưởi Năm Roi và các loại trái có kích thước lớn. Miệng túi rộng, dây rút dễ thao tác và cố định.",
        keywords: ["buoi da xanh", "tui bao buoi", "tui bao trai lon", "tui day rut"],
        base_price: 76000,
        size_a: "35x40cm",
        size_b: "40x45cm",
        fabric_a: "Thick non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 3200,
        stock_b: 1800,
        sold_count: 72,
        rating_avg: 4.6,
        rating_count: 17,
    },
    {
        name: "Túi lưới bao bưởi thoáng khí",
        slug: "tui-luoi-bao-buoi-thoang-khi",
        category_slug: CATEGORY_SLUGS.pomelo,
        brand: "Farm Bag",
        short_description: "Túi lưới bao bưởi thoáng khí, phù hợp với vườn cần quan sát trái thường xuyên.",
        description: "Túi lưới có độ thông thoáng cao, phù hợp khi cần bảo vệ trái nhưng vẫn muốn quan sát màu sắc và kích thước trái trong quá trình chăm sóc.",
        keywords: ["tui luoi buoi", "bao buoi", "thoang khi", "tui bao trai cay"],
        base_price: 59000,
        size_a: "30x35cm",
        size_b: "35x40cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Thick mesh",
        stock_a: 5000,
        stock_b: 3300,
        sold_count: 55,
        rating_avg: 4.4,
        rating_count: 12,
    },
    {
        name: "Túi bao trái ổi vải không dệt 15x20cm",
        slug: "tui-bao-trai-oi-vai-khong-det-15x20cm",
        category_slug: CATEGORY_SLUGS.guava,
        brand: "Nguyen Lien",
        short_description: "Túi bao ổi phổ thông, nhỏ gọn và dễ sử dụng.",
        description: "Túi bao trái ổi giúp hạn chế ruồi vàng, côn trùng và bụi bẩn. Kích thước phù hợp với nhiều giống ổi phổ biến.",
        keywords: ["tui bao oi", "bao trai oi", "ruoi vang", "vai khong det"],
        base_price: 32000,
        size_a: "15x20cm",
        size_b: "18x22cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 9000,
        stock_b: 6600,
        sold_count: 210,
        rating_avg: 4.8,
        rating_count: 49,
    },
    {
        name: "Túi bao ổi ruột đỏ có dây rút",
        slug: "tui-bao-oi-ruot-do-day-rut",
        category_slug: CATEGORY_SLUGS.guava,
        brand: "Nguyen Lien",
        short_description: "Túi bao ổi có dây rút, phù hợp cho ổi ruột đỏ và ổi lê.",
        description: "Dòng túi bao ổi dành cho nhà vườn cần thao tác nhanh. Dây rút giúp cố định miệng túi tốt hơn khi treo trên cành.",
        keywords: ["oi ruot do", "tui bao oi", "tui day rut", "bao trai cay"],
        base_price: 35000,
        size_a: "16x22cm",
        size_b: "18x25cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 8500,
        stock_b: 5200,
        sold_count: 146,
        rating_avg: 4.7,
        rating_count: 34,
    },
    {
        name: "Túi xốp lưới bao ổi chống trầy",
        slug: "tui-xop-luoi-bao-oi-chong-tray",
        category_slug: CATEGORY_SLUGS.guava,
        brand: "Green Farm",
        short_description: "Túi xốp lưới bao ổi, giúp hạn chế trầy xước vỏ trái.",
        description: "Túi xốp lưới mềm, phù hợp với trái ổi cần hạn chế va chạm và trầy xước trong giai đoạn phát triển gần thu hoạch.",
        keywords: ["tui xop luoi", "bao oi", "chong tray", "tui bao trai"],
        base_price: 42000,
        size_a: "15x20cm",
        size_b: "18x22cm",
        fabric_a: "White mesh foam",
        fabric_b: "Thick mesh foam",
        stock_a: 5600,
        stock_b: 4100,
        sold_count: 64,
        rating_avg: 4.5,
        rating_count: 13,
    },
    {
        name: "Túi bao thanh long vải không dệt 25x30cm",
        slug: "tui-bao-thanh-long-vai-khong-det-25x30cm",
        category_slug: CATEGORY_SLUGS.dragonFruit,
        brand: "Nguyen Lien",
        short_description: "Túi bao thanh long size vừa, dễ thao tác.",
        description: "Túi bao thanh long giúp bảo vệ trái trong quá trình phát triển, hạn chế bụi bẩn, côn trùng và trầy xước bề mặt.",
        keywords: ["tui bao thanh long", "bao thanh long", "vai khong det", "tui bao trai"],
        base_price: 50000,
        size_a: "25x30cm",
        size_b: "28x35cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 4800,
        stock_b: 3400,
        sold_count: 98,
        rating_avg: 4.6,
        rating_count: 20,
    },
    {
        name: "Túi bao thanh long ruột đỏ size lớn",
        slug: "tui-bao-thanh-long-ruot-do-size-lon",
        category_slug: CATEGORY_SLUGS.dragonFruit,
        brand: "Farm Bag",
        short_description: "Túi bao thanh long size lớn dành cho trái phát triển mạnh.",
        description: "Phù hợp cho thanh long ruột đỏ hoặc trái có kích thước lớn. Chất liệu thoáng khí, miệng túi dễ thao tác.",
        keywords: ["thanh long ruot do", "tui bao thanh long", "size lon", "day rut"],
        base_price: 56000,
        size_a: "28x35cm",
        size_b: "30x40cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 3900,
        stock_b: 2600,
        sold_count: 73,
        rating_avg: 4.4,
        rating_count: 14,
    },
    {
        name: "Túi giấy bao thanh long chống bụi",
        slug: "tui-giay-bao-thanh-long-chong-bui",
        category_slug: CATEGORY_SLUGS.dragonFruit,
        brand: "Green Farm",
        short_description: "Túi giấy bao thanh long, phù hợp để chống bụi và giảm nắng nhẹ.",
        description: "Túi giấy dùng cho thanh long, phù hợp với các vườn cần bảo vệ bề mặt trái và giảm tác động từ môi trường.",
        keywords: ["tui giay thanh long", "bao thanh long", "chong bui", "tui giay"],
        base_price: 47000,
        size_a: "25x30cm",
        size_b: "28x35cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 2600,
        stock_b: 1900,
        sold_count: 36,
        rating_avg: 4.2,
        rating_count: 8,
    },
    {
        name: "Túi bao trái mít vải không dệt 45x55cm",
        slug: "tui-bao-trai-mit-vai-khong-det-45x55cm",
        category_slug: CATEGORY_SLUGS.jackfruit,
        brand: "Nguyen Lien",
        short_description: "Túi bao mít kích thước lớn, phù hợp cho trái lớn và nặng.",
        description: "Túi bao mít có kích thước rộng, phù hợp với các trái lớn. Chất liệu dày giúp tăng độ bền khi sử dụng ngoài vườn.",
        keywords: ["tui bao mit", "bao trai mit", "tui size dai", "vai khong det"],
        base_price: 98000,
        size_a: "45x55cm",
        size_b: "50x60cm",
        fabric_a: "Thick non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 1600,
        stock_b: 1100,
        sold_count: 48,
        rating_avg: 4.7,
        rating_count: 11,
    },
    {
        name: "Túi bao mít Thái dây rút chắc chắn",
        slug: "tui-bao-mit-thai-day-rut-chac-chan",
        category_slug: CATEGORY_SLUGS.jackfruit,
        brand: "Nguyen Lien",
        short_description: "Túi bao mít Thái miệng rộng, dây rút chắc chắn.",
        description: "Dùng cho mít Thái và các giống mít trái lớn. Thiết kế dây rút giúp cố định túi khi trái tiếp tục phát triển.",
        keywords: ["mit thai", "tui bao mit", "day rut", "tui trai lon"],
        base_price: 108000,
        size_a: "50x60cm",
        size_b: "55x65cm",
        fabric_a: "Thick non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 1400,
        stock_b: 900,
        sold_count: 39,
        rating_avg: 4.6,
        rating_count: 10,
    },
    {
        name: "Túi lưới bao mít thoáng khí",
        slug: "tui-luoi-bao-mit-thoang-khi",
        category_slug: CATEGORY_SLUGS.jackfruit,
        brand: "Farm Bag",
        short_description: "Túi lưới bao mít kích thước lớn, thoáng khí.",
        description: "Phù hợp với vườn cần túi bao trái lớn nhưng vẫn duy trì độ thông thoáng cao. Dễ quan sát tình trạng trái trong quá trình chăm sóc.",
        keywords: ["tui luoi mit", "bao mit", "thoang khi", "tui lon"],
        base_price: 89000,
        size_a: "45x55cm",
        size_b: "50x60cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Thick mesh",
        stock_a: 1700,
        stock_b: 1200,
        sold_count: 27,
        rating_avg: 4.3,
        rating_count: 7,
    },
    {
        name: "Túi bao chùm nho vải không dệt 20x30cm",
        slug: "tui-bao-chum-nho-vai-khong-det-20x30cm",
        category_slug: CATEGORY_SLUGS.grape,
        brand: "Nguyen Lien",
        short_description: "Túi bao chùm nho, phù hợp để bao trái theo chùm.",
        description: "Túi dùng cho nho hoặc các loại trái nhỏ mọc theo chùm. Kích thước vừa, dễ bao và tháo túi.",
        keywords: ["tui bao nho", "bao chum nho", "tui bao chum", "vai khong det"],
        base_price: 41000,
        size_a: "20x30cm",
        size_b: "25x35cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 6200,
        stock_b: 4400,
        sold_count: 57,
        rating_avg: 4.5,
        rating_count: 13,
    },
    {
        name: "Túi giấy bao nho chống côn trùng",
        slug: "tui-giay-bao-chum-nho-chong-con-trung",
        category_slug: CATEGORY_SLUGS.grape,
        brand: "Green Farm",
        short_description: "Túi giấy bao nho có độ che phủ tốt, phù hợp bao theo chùm.",
        description: "Dòng túi giấy dùng cho nho, giúp che chắn và hạn chế côn trùng tiếp xúc trực tiếp với trái.",
        keywords: ["tui giay nho", "bao chum nho", "chong con trung", "tui bao"],
        base_price: 45000,
        size_a: "20x30cm",
        size_b: "25x35cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 2800,
        stock_b: 1900,
        sold_count: 31,
        rating_avg: 4.2,
        rating_count: 6,
    },
    {
        name: "Túi lưới bao nho thoáng khí",
        slug: "tui-luoi-bao-chum-nho-thoang-khi",
        category_slug: CATEGORY_SLUGS.grape,
        brand: "Farm Bag",
        short_description: "Túi lưới bao nho nhẹ và thoáng khí.",
        description: "Túi lưới dùng cho nho hoặc các chùm trái nhỏ, phù hợp khi cần độ thông thoáng cao và dễ quan sát.",
        keywords: ["tui luoi nho", "bao chum nho", "thoang khi", "tui luoi"],
        base_price: 36000,
        size_a: "18x28cm",
        size_b: "22x32cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Fine mesh",
        stock_a: 5400,
        stock_b: 3800,
        sold_count: 44,
        rating_avg: 4.4,
        rating_count: 9,
    },
    {
        name: "Túi bao nhãn và vải không dệt 25x35cm",
        slug: "tui-bao-nhan-vai-khong-det-25x35cm",
        category_slug: CATEGORY_SLUGS.longanLychee,
        brand: "Nguyen Lien",
        short_description: "Túi bao nhãn theo chùm, phù hợp sử dụng trong vườn nhãn.",
        description: "Túi bao nhãn giúp bảo vệ chùm trái khỏi côn trùng và bụi bẩn. Phù hợp cho nhãn xuồng, nhãn tiêu và các giống nhãn phổ biến khác.",
        keywords: ["tui bao nhan", "bao chum nhan", "nhan vai", "vai khong det"],
        base_price: 43000,
        size_a: "25x35cm",
        size_b: "30x40cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 6400,
        stock_b: 4600,
        sold_count: 86,
        rating_avg: 4.6,
        rating_count: 19,
    },
    {
        name: "Túi bao trái vải theo chùm",
        slug: "tui-bao-trai-vai-theo-chum",
        category_slug: CATEGORY_SLUGS.longanLychee,
        brand: "Nguyen Lien",
        short_description: "Túi bao trái vải, phù hợp để bao theo chùm.",
        description: "Sản phẩm dùng cho trái vải và các loại trái nhỏ mọc theo chùm. Thiết kế nhẹ, dễ thao tác khi cần bao nhiều chùm trên cây.",
        keywords: ["tui bao vai", "bao chum vai", "tui bao trai vai", "chum trai"],
        base_price: 44000,
        size_a: "25x35cm",
        size_b: "30x40cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 5200,
        stock_b: 3100,
        sold_count: 52,
        rating_avg: 4.5,
        rating_count: 12,
    },
    {
        name: "Túi lưới bao nhãn và vải thoáng khí",
        slug: "tui-luoi-bao-nhan-vai-thoang-khi",
        category_slug: CATEGORY_SLUGS.longanLychee,
        brand: "Farm Bag",
        short_description: "Túi lưới bao nhãn và vải, phù hợp với các chùm trái nhỏ.",
        description: "Túi lưới thoáng khí dùng cho nhãn, vải hoặc các loại trái mọc theo chùm cần được quan sát thường xuyên.",
        keywords: ["tui luoi nhan", "tui luoi vai", "bao chum", "thoang khi"],
        base_price: 37000,
        size_a: "25x35cm",
        size_b: "30x40cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Fine mesh",
        stock_a: 5900,
        stock_b: 4200,
        sold_count: 33,
        rating_avg: 4.3,
        rating_count: 8,
    },
    {
        name: "Túi bao buồng chuối vải không dệt 60x90cm",
        slug: "tui-bao-buong-chuoi-vai-khong-det-60x90cm",
        category_slug: CATEGORY_SLUGS.banana,
        brand: "Nguyen Lien",
        short_description: "Túi bao buồng chuối có kích thước dài.",
        description: "Túi bao buồng chuối giúp bảo vệ buồng trái trong quá trình phát triển. Kích thước dài, phù hợp cho các buồng chuối cỡ vừa.",
        keywords: ["tui bao chuoi", "bao buong chuoi", "tui dai", "vai khong det"],
        base_price: 115000,
        size_a: "60x90cm",
        size_b: "70x100cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1300,
        stock_b: 900,
        sold_count: 61,
        rating_avg: 4.7,
        rating_count: 14,
    },
    {
        name: "Túi bao buồng chuối size lớn 80x120cm",
        slug: "tui-bao-buong-chuoi-size-dai-80x120cm",
        category_slug: CATEGORY_SLUGS.banana,
        brand: "Nguyen Lien",
        short_description: "Túi bao chuối kích thước lớn, phù hợp với buồng chuối lớn.",
        description: "Dòng túi bao chuối size lớn, dùng cho các buồng chuối lớn hoặc nhà vườn cần phạm vi che phủ rộng.",
        keywords: ["tui bao chuoi dai", "bao buong chuoi", "size dai", "chuoi"],
        base_price: 145000,
        size_a: "80x120cm",
        size_b: "90x130cm",
        fabric_a: "Thick non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 900,
        stock_b: 650,
        sold_count: 34,
        rating_avg: 4.5,
        rating_count: 8,
    },
    {
        name: "Túi lưới bao buồng chuối thoáng khí",
        slug: "tui-luoi-bao-buong-chuoi-thoang-khi",
        category_slug: CATEGORY_SLUGS.banana,
        brand: "Farm Bag",
        short_description: "Túi lưới bao buồng chuối nhẹ và thoáng khí.",
        description: "Túi lưới dài, phù hợp với vườn chuối cần độ thông thoáng cao và dễ quan sát buồng trái.",
        keywords: ["tui luoi chuoi", "bao chuoi", "buong chuoi", "thoang khi"],
        base_price: 99000,
        size_a: "60x90cm",
        size_b: "70x100cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Thick mesh",
        stock_a: 1500,
        stock_b: 1000,
        sold_count: 29,
        rating_avg: 4.2,
        rating_count: 7,
    },
    {
        name: "Túi bao na và mãng cầu không dệt 18x25cm",
        slug: "tui-bao-trai-na-vai-khong-det-18x25cm",
        category_slug: CATEGORY_SLUGS.custardApple,
        brand: "Nguyen Lien",
        short_description: "Túi bao trái size vừa, có dây rút.",
        description: "Túi bao na và mãng cầu giúp hạn chế côn trùng tiếp xúc với trái, phù hợp sử dụng trong giai đoạn trái phát triển.",
        keywords: ["tui bao na", "bao trai na", "mang cau", "vai khong det"],
        base_price: 38000,
        size_a: "18x25cm",
        size_b: "20x28cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 5800,
        stock_b: 3900,
        sold_count: 51,
        rating_avg: 4.5,
        rating_count: 11,
    },
    {
        name: "Túi bao mãng cầu dai size lớn",
        slug: "tui-bao-mang-cau-dai-size-lon",
        category_slug: CATEGORY_SLUGS.custardApple,
        brand: "Nguyen Lien",
        short_description: "Túi bao mãng cầu dai, phù hợp cho trái kích thước lớn.",
        description: "Sản phẩm dùng cho mãng cầu dai và các loại trái có bề mặt dễ bị côn trùng tấn công. Chất liệu nhẹ và thoáng khí.",
        keywords: ["tui bao mang cau", "mang cau dai", "tui size lon", "bao trai"],
        base_price: 46000,
        size_a: "22x30cm",
        size_b: "25x35cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 4100,
        stock_b: 2700,
        sold_count: 37,
        rating_avg: 4.4,
        rating_count: 9,
    },
    {
        name: "Túi xốp lưới chống trầy",
        slug: "tui-xop-luoi-bao-na-chong-tray",
        category_slug: CATEGORY_SLUGS.custardApple,
        brand: "Green Farm",
        short_description: "Túi xốp lưới mềm, giúp giảm trầy xước.",
        description: "Túi xốp lưới mềm dùng cho na, mãng cầu hoặc các loại trái có bề mặt dễ trầy. Phù hợp với nhu cầu bảo vệ nhẹ khỏi va chạm.",
        keywords: ["tui xop luoi", "bao na", "mang cau", "chong tray"],
        base_price: 49000,
        size_a: "18x25cm",
        size_b: "22x30cm",
        fabric_a: "White mesh foam",
        fabric_b: "Thick mesh foam",
        stock_a: 3300,
        stock_b: 2200,
        sold_count: 22,
        rating_avg: 4.1,
        rating_count: 5,
    },
    {
        name: "Túi bao trái mướp dài không dệt 15x45cm",
        slug: "tui-bao-muop-dai-vai-khong-det-15x45cm",
        category_slug: CATEGORY_SLUGS.longVegetable,
        brand: "Nguyen Lien",
        short_description: "Túi bao mướp dài, phù hợp cho các loại quả dài.",
        description: "Túi dùng cho mướp, bầu, bí và các loại quả dài khác. Thiết kế dài hơn túi bao trái thông thường.",
        keywords: ["tui bao muop", "tui bao qua dai", "bau bi", "vai khong det"],
        base_price: 53000,
        size_a: "15x45cm",
        size_b: "18x50cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 4300,
        stock_b: 3000,
        sold_count: 68,
        rating_avg: 4.6,
        rating_count: 15,
    },
    {
        name: "Túi bao khổ qua vải không dệt 12x30cm",
        slug: "tui-bao-kho-qua-vai-khong-det-12x30cm",
        category_slug: CATEGORY_SLUGS.longVegetable,
        brand: "Nguyen Lien",
        short_description: "Túi bao khổ qua nhỏ gọn, dễ thao tác.",
        description: "Túi bao khổ qua giúp bảo vệ trái trong quá trình phát triển. Kích thước nhỏ, phù hợp với các loại quả có chiều dài trung bình.",
        keywords: ["tui bao kho qua", "kho qua", "qua dai", "vai khong det"],
        base_price: 36000,
        size_a: "12x30cm",
        size_b: "15x35cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 6500,
        stock_b: 4700,
        sold_count: 74,
        rating_avg: 4.5,
        rating_count: 16,
    },
    {
        name: "Túi bao trái bầu size dài",
        slug: "tui-bao-bau-bi-size-dai",
        category_slug: CATEGORY_SLUGS.longVegetable,
        brand: "Farm Bag",
        short_description: "Túi bao trái bầu có thiết kế dài và rộng.",
        description: "Dòng túi phù hợp cho bầu, bí, mướp và các loại rau củ quả có dáng dài. Dễ sử dụng trong vườn rau.",
        keywords: ["tui bao bau", "tui bao bi", "qua dai", "rau cu qua"],
        base_price: 58000,
        size_a: "18x50cm",
        size_b: "20x60cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "2-layer non-woven fabric",
        stock_a: 3600,
        stock_b: 2400,
        sold_count: 41,
        rating_avg: 4.3,
        rating_count: 9,
    },
    {
        name: "Túi bao xoài mini 18x25cm",
        slug: "tui-bao-xoai-mini-18x25cm",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Nguyen Lien",
        short_description: "Túi bao xoài mini, phù hợp cho trái nhỏ hoặc giai đoạn đầu phát triển.",
        description: "Túi bao xoài kích thước nhỏ, dùng khi trái còn nhỏ hoặc cho các giống xoài có kích thước trung bình.",
        keywords: ["tui bao xoai mini", "xoai nho", "bao xoai", "tui nho"],
        base_price: 34000,
        size_a: "18x25cm",
        size_b: "20x27cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "White plastic mesh",
        stock_a: 7000,
        stock_b: 5100,
        sold_count: 63,
        rating_avg: 4.4,
        rating_count: 13,
    },
    {
        name: "Túi giấy kraft bao bưởi 35x40cm",
        slug: "tui-bao-buoi-giay-kraft-35x40cm",
        category_slug: CATEGORY_SLUGS.pomelo,
        brand: "Green Farm",
        short_description: "Túi giấy kraft bao bưởi có độ che phủ tốt.",
        description: "Túi giấy kraft dùng cho bưởi và các loại trái lớn, phù hợp với nhu cầu che nắng nhẹ và hạn chế bụi bẩn.",
        keywords: ["tui giay buoi", "giay kraft", "bao buoi", "tui trai lon"],
        base_price: 72000,
        size_a: "35x40cm",
        size_b: "40x45cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 2300,
        stock_b: 1500,
        sold_count: 21,
        rating_avg: 4.1,
        rating_count: 5,
    },
    {
        name: "Túi bao ổi mini 12x18cm",
        slug: "tui-bao-oi-mini-12x18cm",
        category_slug: CATEGORY_SLUGS.guava,
        brand: "Nguyen Lien",
        short_description: "Túi bao ổi nhỏ, dùng cho trái non hoặc giống ổi trái nhỏ.",
        description: "Kích thước nhỏ gọn, phù hợp cho ổi non hoặc các giống ổi có trái nhỏ.",
        keywords: ["tui bao oi mini", "oi non", "tui nho", "bao oi"],
        base_price: 28000,
        size_a: "12x18cm",
        size_b: "15x20cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Fine mesh",
        stock_a: 7800,
        stock_b: 5300,
        sold_count: 59,
        rating_avg: 4.3,
        rating_count: 12,
    },
    {
        name: "Túi lưới trắng bao thanh long",
        slug: "tui-bao-thanh-long-luoi-trang",
        category_slug: CATEGORY_SLUGS.dragonFruit,
        brand: "Farm Bag",
        short_description: "Túi lưới trắng bao thanh long, thoáng khí.",
        description: "Dùng cho thanh long cần độ thông thoáng cao, giúp dễ quan sát màu sắc và kích thước trái.",
        keywords: ["tui luoi thanh long", "bao thanh long", "luoi trang", "thoang khi"],
        base_price: 43000,
        size_a: "25x30cm",
        size_b: "28x35cm",
        fabric_a: "White plastic mesh",
        fabric_b: "Thick mesh",
        stock_a: 3900,
        stock_b: 2600,
        sold_count: 18,
        rating_avg: 4.0,
        rating_count: 4,
    },
    {
        name: "Túi giấy kraft bao mít size lớn",
        slug: "tui-bao-mit-giay-kraft-size-lon",
        category_slug: CATEGORY_SLUGS.jackfruit,
        brand: "Green Farm",
        short_description: "Túi giấy kraft bao mít kích thước lớn.",
        description: "Túi giấy kraft dùng cho mít hoặc các loại trái rất lớn, giúp che bụi và giảm tác động của nắng nhẹ.",
        keywords: ["tui giay mit", "giay kraft", "bao mit", "tui size lon"],
        base_price: 95000,
        size_a: "45x55cm",
        size_b: "50x60cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 1100,
        stock_b: 750,
        sold_count: 12,
        rating_avg: 4.0,
        rating_count: 3,
        status: "INACTIVE",
    },
    {
        name: "Túi bao nho mini 18x25cm",
        slug: "tui-bao-chum-nho-mini-18x25cm",
        category_slug: CATEGORY_SLUGS.grape,
        brand: "Nguyen Lien",
        short_description: "Túi bao chùm nhỏ, phù hợp cho các chùm nho cỡ vừa.",
        description: "Túi bao chùm nho kích thước nhỏ, phù hợp với chùm trái cỡ vừa hoặc vườn trồng thử nghiệm.",
        keywords: ["tui bao nho mini", "chum nho", "tui nho", "bao nho"],
        base_price: 32000,
        size_a: "18x25cm",
        size_b: "20x30cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Fine mesh",
        stock_a: 4200,
        stock_b: 3000,
        sold_count: 24,
        rating_avg: 4.2,
        rating_count: 5,
    },
    {
        name: "Túi giấy kraft bao nhãn và vải",
        slug: "tui-bao-nhan-giay-kraft",
        category_slug: CATEGORY_SLUGS.longanLychee,
        brand: "Green Farm",
        short_description: "Túi giấy kraft dùng để bao chùm nhãn và vải.",
        description: "Túi giấy kraft dùng cho nhãn, vải hoặc các chùm trái nhỏ cần độ che phủ tốt.",
        keywords: ["tui giay nhan", "bao chum nhan", "giay kraft", "nhan vai"],
        base_price: 42000,
        size_a: "25x35cm",
        size_b: "30x40cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 1900,
        stock_b: 1200,
        sold_count: 14,
        rating_avg: 4.1,
        rating_count: 4,
    },
    {
        name: "Túi giấy kraft bao buồng chuối",
        slug: "tui-bao-chuoi-giay-kraft",
        category_slug: CATEGORY_SLUGS.banana,
        brand: "Green Farm",
        short_description: "Túi giấy kraft dùng cho buồng chuối.",
        description: "Dùng cho buồng chuối cần được bảo vệ khỏi bụi và nắng nhẹ. Kích thước dài, phù hợp treo ngoài vườn.",
        keywords: ["tui giay chuoi", "bao buong chuoi", "giay kraft", "tui dai"],
        base_price: 125000,
        size_a: "60x90cm",
        size_b: "70x100cm",
        fabric_a: "Yellow kraft paper",
        fabric_b: "2-layer kraft paper",
        stock_a: 800,
        stock_b: 500,
        sold_count: 9,
        rating_avg: 3.9,
        rating_count: 3,
        status: "INACTIVE",
    },
    {
        name: "Túi bao mãng cầu xiêm 30x40cm",
        slug: "tui-bao-mang-cau-xiem-30x40cm",
        category_slug: CATEGORY_SLUGS.custardApple,
        brand: "Nguyen Lien",
        short_description: "Túi bao mãng cầu xiêm kích thước lớn.",
        description: "Túi bao mãng cầu xiêm có kích thước lớn hơn túi bao na thông thường, phù hợp với các trái lớn.",
        keywords: ["mang cau xiem", "tui bao mang cau", "tui size lon", "bao trai"],
        base_price: 62000,
        size_a: "30x40cm",
        size_b: "35x45cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 2400,
        stock_b: 1600,
        sold_count: 19,
        rating_avg: 4.2,
        rating_count: 5,
    },
    {
        name: "Túi bao dưa leo 10x28cm",
        slug: "tui-bao-dua-leo-10x28cm",
        category_slug: CATEGORY_SLUGS.longVegetable,
        brand: "Nguyen Lien",
        short_description: "Túi bao dưa leo nhỏ và dài.",
        description: "Túi dùng cho dưa leo và các loại quả nhỏ có dáng dài. Phù hợp với vườn rau cần bao trái để hạn chế côn trùng.",
        keywords: ["tui bao dua leo", "dua leo", "qua dai", "tui nho"],
        base_price: 30000,
        size_a: "10x28cm",
        size_b: "12x32cm",
        fabric_a: "White non-woven fabric",
        fabric_b: "Fine mesh",
        stock_a: 6200,
        stock_b: 4400,
        sold_count: 47,
        rating_avg: 4.4,
        rating_count: 10,
    },
    {
        name: "Túi bao xoài 2 lớp cao cấp",
        slug: "tui-bao-xoai-cao-cap-2-lop",
        category_slug: CATEGORY_SLUGS.mango,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao xoài 2 lớp, dày hơn dòng phổ thông.",
        description: "Dòng túi bao xoài chất lượng cao, chất liệu dày hơn, phù hợp với nhà vườn cần độ bền tốt khi sử dụng ngoài trời.",
        keywords: ["tui bao xoai cao cap", "2 lop", "vai khong det", "tui day"],
        base_price: 66000,
        size_a: "25x35cm",
        size_b: "28x38cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 2600,
        stock_b: 1800,
        sold_count: 26,
        rating_avg: 4.5,
        rating_count: 6,
    },
    {
        name: "Túi bao bưởi 2 lớp cao cấp",
        slug: "tui-bao-buoi-cao-cap-2-lop",
        category_slug: CATEGORY_SLUGS.pomelo,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao bưởi 2 lớp kích thước lớn.",
        description: "Dòng túi bao bưởi cao cấp, phù hợp với trái lớn và nhu cầu bảo vệ tốt hơn so với dòng phổ thông.",
        keywords: ["tui bao buoi cao cap", "2 lop", "tui size lon", "buoi"],
        base_price: 88000,
        size_a: "35x40cm",
        size_b: "40x45cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1900,
        stock_b: 1200,
        sold_count: 18,
        rating_avg: 4.4,
        rating_count: 5,
    },
    {
        name: "Túi bao ổi 2 lớp cao cấp",
        slug: "tui-bao-oi-cao-cap-2-lop",
        category_slug: CATEGORY_SLUGS.guava,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao ổi 2 lớp, chắc chắn hơn dòng thông thường.",
        description: "Dòng túi bao ổi chất lượng cao, phù hợp với nhà vườn cần túi dày và giữ dáng tốt hơn.",
        keywords: ["tui bao oi cao cap", "2 lop", "bao oi", "tui day"],
        base_price: 46000,
        size_a: "16x22cm",
        size_b: "18x25cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 3300,
        stock_b: 2300,
        sold_count: 22,
        rating_avg: 4.5,
        rating_count: 5,
    },
    {
        name: "Túi bao thanh long cao cấp",
        slug: "tui-bao-thanh-long-cao-cap",
        category_slug: CATEGORY_SLUGS.dragonFruit,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao thanh long làm từ chất liệu dày.",
        description: "Dòng túi bao thanh long có chất liệu dày, phù hợp với nhu cầu sử dụng bền hơn trong vườn.",
        keywords: ["tui bao thanh long cao cap", "2 lop", "thanh long", "tui day"],
        base_price: 62000,
        size_a: "28x35cm",
        size_b: "30x40cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 2100,
        stock_b: 1500,
        sold_count: 13,
        rating_avg: 4.2,
        rating_count: 4,
    },
    {
        name: "Túi bao mít cao cấp size lớn",
        slug: "tui-bao-mit-cao-cap-size-dai",
        category_slug: CATEGORY_SLUGS.jackfruit,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao mít chất lượng cao, kích thước lớn.",
        description: "Túi bao mít size lớn, chất liệu dày, phù hợp với trái lớn và thời gian treo ngoài vườn lâu hơn.",
        keywords: ["tui bao mit cao cap", "size dai", "mit", "tui day"],
        base_price: 125000,
        size_a: "55x65cm",
        size_b: "60x70cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 700,
        stock_b: 450,
        sold_count: 8,
        rating_avg: 4.1,
        rating_count: 3,
        status: "INACTIVE",
    },
    {
        name: "Túi bao nho chống bụi cao cấp",
        slug: "tui-bao-nho-cao-cap-chong-bui",
        category_slug: CATEGORY_SLUGS.grape,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao nho chất lượng cao, che bụi tốt.",
        description: "Túi bao chùm nho làm từ chất liệu dày hơn, phù hợp với các vườn cần bảo vệ chùm trái tốt hơn.",
        keywords: ["tui bao nho cao cap", "chong bui", "nho", "bao chum"],
        base_price: 52000,
        size_a: "22x32cm",
        size_b: "25x35cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1900,
        stock_b: 1300,
        sold_count: 11,
        rating_avg: 4.0,
        rating_count: 3,
    },
    {
        name: "Túi bao nhãn và vải cao cấp",
        slug: "tui-bao-nhan-vai-cao-cap",
        category_slug: CATEGORY_SLUGS.longanLychee,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao nhãn và vải cao cấp, chất liệu dày.",
        description: "Túi bao nhãn và vải có chất liệu dày, dùng cho các vườn cần bảo vệ chùm trái tốt hơn.",
        keywords: ["tui bao nhan cao cap", "tui bao vai", "bao chum", "2 lop"],
        base_price: 54000,
        size_a: "30x40cm",
        size_b: "35x45cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1700,
        stock_b: 1100,
        sold_count: 10,
        rating_avg: 4.0,
        rating_count: 3,
    },
    {
        name: "Túi bao buồng chuối 2 lớp cao cấp",
        slug: "tui-bao-chuoi-cao-cap-2-lop",
        category_slug: CATEGORY_SLUGS.banana,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao chuối chất lượng cao, chất liệu dày.",
        description: "Túi bao chuối làm từ chất liệu dày, phù hợp với buồng lớn và có thể sử dụng ngoài vườn trong thời gian dài hơn.",
        keywords: ["tui bao chuoi cao cap", "2 lop", "buong chuoi", "tui dai"],
        base_price: 165000,
        size_a: "80x120cm",
        size_b: "90x130cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 520,
        stock_b: 350,
        sold_count: 7,
        rating_avg: 4.0,
        rating_count: 2,
        status: "INACTIVE",
    },
    {
        name: "Túi bao na và mãng cầu 2 lớp cao cấp",
        slug: "tui-bao-na-cao-cap-2-lop",
        category_slug: CATEGORY_SLUGS.custardApple,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao làm từ chất liệu dày, có dây rút.",
        description: "Dòng túi bao chất lượng cao, phù hợp với các loại trái dễ trầy xước và cần túi dày hơn dòng phổ thông.",
        keywords: ["tui bao na cao cap", "2 lop", "mang cau", "tui day"],
        base_price: 56000,
        size_a: "22x30cm",
        size_b: "25x35cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1600,
        stock_b: 1000,
        sold_count: 9,
        rating_avg: 4.1,
        rating_count: 3,
    },
    {
        name: "Túi bao rau củ quả dài cao cấp",
        slug: "tui-bao-rau-cu-qua-dai-cao-cap",
        category_slug: CATEGORY_SLUGS.longVegetable,
        brand: "Nguyen Lien Premium",
        short_description: "Túi bao rau củ quả dài, chất liệu dày.",
        description: "Dòng túi bao chất lượng cao dành cho mướp, bầu, bí, dưa leo, khổ qua và các loại quả dài khác.",
        keywords: ["tui bao rau cu", "qua dai", "2 lop", "tui dai"],
        base_price: 69000,
        size_a: "18x50cm",
        size_b: "20x60cm",
        fabric_a: "2-layer non-woven fabric",
        fabric_b: "Thick non-woven fabric",
        stock_a: 1800,
        stock_b: 1200,
        sold_count: 12,
        rating_avg: 4.1,
        rating_count: 3,
        status: "INACTIVE",
    },
];

const simpleProductsData = [
    {
        name: "Dây thun đen",
        slug: "day-thun-den",
        category_slug: CATEGORY_SLUGS.supplies,
        brand: "Nguyen Lien",
        short_description:
            "Dây thun đen đóng bịch, dùng để buộc túi bao trái cây, bó hàng và cố định vật tư nhỏ.",
        description:
            "Dây thun đen dạng bịch, phù hợp sử dụng trong vườn, đóng gói hàng và buộc các loại túi bao trái cây. Sản phẩm thuộc nhóm đơn giản, khách chỉ cần chọn số lượng bịch khi mua.",
        keywords: [
            "day thun den",
            "day thun",
            "thun buoc tui",
            "vat tu nong nghiep",
            "day buoc",
        ],
        price: 50000,
        stock: 120,
        unit_type: "PACK",
        unit_display_name: "Bịch",
        pack_size: 1,
        min_order_qty: 1,
        max_order_qty: null,
        qty_step: 1,
        sold_count: 18,
        rating_avg: 4.6,
        rating_count: 5,
        is_best_seller: false,
        status: "ACTIVE",
    },
];

const toSkuPart = (value) => {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "D")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 36);
};

const buildPriceTiers = (basePrice) => {
    return [
        {
            min_qty: 1,
            max_qty: null,
            unit_price: basePrice,
        },
    ];
};

const buildPromotion = (enabled) => ({
    enabled,
    type: "FIXED",
    value: enabled ? 5000 : 0,
    starts_at: null,
    ends_at: null,
    allow_voucher: true,
});

const buildUnits = (basePrice, promotionEnabled = false) => {
    return [
        {
            unit_type: "PACK",
            display_name: "Gói 100 cái",
            pack_size: 100,
            price_tiers: buildPriceTiers(basePrice),
            min_order_qty: 1,
            max_order_qty: null,
            qty_step: 1,
            is_default: true,
            currency: "VND",
            promotion: buildPromotion(promotionEnabled),
        },
        {
            unit_type: "BOX",
            display_name: "Thùng 1.000 cái",
            pack_size: 1000,
            price_tiers: buildPriceTiers(Math.round(basePrice * 9.2)),
            min_order_qty: 1,
            max_order_qty: null,
            qty_step: 1,
            is_default: false,
            currency: "VND",
            promotion: buildPromotion(promotionEnabled),
        },
    ];
};

const buildVariants = (product, promotionEnabled = false) => {
    return [
        {
            sku: `NL-${toSkuPart(product.slug)}-A`,
            size: product.size_a,
            fabric_type: MATERIAL_NAMES_VI[product.fabric_a] || product.fabric_a,
            stock: {
                available: product.stock_a,
                reserved: 0,
                sold: product.sold_count || 0,
            },
            units: buildUnits(product.base_price, promotionEnabled),
        },
        {
            sku: `NL-${toSkuPart(product.slug)}-B`,
            size: product.size_b,
            fabric_type: MATERIAL_NAMES_VI[product.fabric_b] || product.fabric_b,
            stock: {
                available: product.stock_b,
                reserved: 0,
                sold: Math.floor((product.sold_count || 0) * 0.45),
            },
            units: buildUnits(
                Math.round(product.base_price * 1.18),
                promotionEnabled
            ),
        },
    ];
};

const normalizeBrand = (brand) =>
    brand === "Nguyen Lien" ? "Nguyễn Liên" : brand;

const buildSimpleSku = (product) => `NL-${toSkuPart(product.slug)}-SIMPLE`;

const seedSimpleProduct = async (item, categoryId) => {
    const existingProduct = await Product.findOne(
        { slug: item.slug },
        null,
        { includeDeleted: true }
    );

    const productPayload = {
        name: item.name,
        slug: item.slug,
        category_id: categoryId,
        brand: normalizeBrand(item.brand),
        product_type: "SIMPLE",
        short_description: item.short_description,
        description: item.description,
        images: [],
        search_keywords: item.keywords,
        rating_avg: item.rating_avg || 0,
        rating_count: item.rating_count || 0,
        sold_count: item.sold_count || 0,
        is_best_seller: Boolean(item.is_best_seller),
        new_until: item.new_until || null,
        status: item.status || "ACTIVE",
        is_deleted: false,
        deleted_at: null,
    };

    let product;

    if (existingProduct) {
        await Product.updateOne(
            { _id: existingProduct._id },
            { $set: productPayload },
            { runValidators: true }
        );

        product = await Product.findById(existingProduct._id);
        console.log(`↻ Updated simple product: ${item.slug}`);
    } else {
        product = await Product.create(productPayload);
        console.log(`✓ Created simple product: ${item.slug}`);
    }

    const sku = buildSimpleSku(item);
    const existingVariants = await Variant.find(
        { product_id: product._id },
        null,
        { includeDeleted: true }
    );
    const matchingVariant =
        existingVariants.find((variant) => variant.sku === sku) ||
        existingVariants[0];
    const variantPayload = {
        product_id: product._id,
        sku,
        size: "Mặc định",
        fabric_type: "Tiêu chuẩn",
        stock: {
            available: item.stock,
            reserved: 0,
            sold: item.sold_count || 0,
        },
        status: product.status,
        is_deleted: false,
        deleted_at: null,
    };

    let variant;

    if (matchingVariant) {
        await Variant.updateOne(
            { _id: matchingVariant._id },
            { $set: variantPayload },
            { runValidators: true }
        );

        variant = await Variant.findById(matchingVariant._id);
        console.log(`  ↻ Updated simple variant: ${sku}`);
    } else {
        variant = await Variant.create(variantPayload);
        console.log(`  ✓ Created simple variant: ${sku}`);
    }

    const extraVariantIds = existingVariants
        .filter((variantItem) => !variantItem._id.equals(variant._id))
        .map((variantItem) => variantItem._id);

    if (extraVariantIds.length > 0) {
        await Variant.updateMany(
            { _id: { $in: extraVariantIds } },
            {
                $set: {
                    status: "INACTIVE",
                    is_deleted: true,
                    deleted_at: new Date(),
                },
            }
        );
    }

    const priceTiers = [
        {
            min_qty: 1,
            max_qty: null,
            unit_price: item.price,
        },
    ];
    VariantUnit.validatePriceTiers(priceTiers);

    const unitPayload = {
        variant_id: variant._id,
        unit_type: item.unit_type,
        display_name: item.unit_display_name,
        pack_size: item.pack_size,
        price_tiers: priceTiers,
        promotion: buildPromotion(false),
        min_order_qty: item.min_order_qty,
        max_order_qty: item.max_order_qty,
        qty_step: item.qty_step,
        is_default: true,
        currency: "VND",
    };

    const existingUnit = await VariantUnit.findOne({
        variant_id: variant._id,
        pack_size: item.pack_size,
    });

    if (existingUnit) {
        await VariantUnit.updateOne(
            { _id: existingUnit._id },
            { $set: unitPayload },
            { runValidators: true }
        );

        console.log(`    ↻ Updated simple unit: ${item.unit_display_name}`);
    } else {
        await VariantUnit.create(unitPayload);
        console.log(`    ✓ Created simple unit: ${item.unit_display_name}`);
    }

    await VariantUnit.updateMany(
        {
            variant_id: variant._id,
            pack_size: { $ne: item.pack_size },
        },
        { $set: { is_default: false } }
    );

    await Variant.updatePriceCache(variant._id);
    await Product.updatePriceCache(product._id);
};

const seedProducts = async () => {
    console.log("== Seeding products ==");

    const categories = await Category.find({
        slug: { $in: Object.values(CATEGORY_SLUGS) },
        status: "ACTIVE",
    }).select("_id slug");

    const categoryMap = new Map(
        categories.map((category) => [category.slug, category._id])
    );

    const missingCategorySlugs = Object.values(CATEGORY_SLUGS).filter(
        (slug) => !categoryMap.has(slug)
    );

    if (missingCategorySlugs.length > 0) {
        throw new Error(
            `Missing categories. Run "npm run seed:categories" first. Missing: ${missingCategorySlugs.join(", ")}`
        );
    }

    for (const [index, item] of productsData.entries()) {
        const categoryId = categoryMap.get(item.category_slug);

        const existingProduct = await Product.findOne(
            { slug: item.slug },
            null,
            { includeDeleted: true }
        );

        let product;

        const productPayload = {
            name: item.name,
            slug: item.slug,
            category_id: categoryId,
            brand: normalizeBrand(item.brand),
            short_description: item.short_description,
            description: item.description,
            images: [],
            search_keywords: item.keywords,
            rating_avg: item.rating_avg || 0,
            rating_count: item.rating_count || 0,
            sold_count: item.sold_count || 0,
            is_best_seller:
                (item.sold_count || 0) >= 100 ||
                index >= productsData.length - 3,
            new_until:
                index >= productsData.length - 6
                    ? new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                    : null,
            status: item.status || "ACTIVE",
            is_deleted: false,
            deleted_at: null,
        };

        if (existingProduct) {
            await Product.updateOne(
                { _id: existingProduct._id },
                { $set: productPayload },
                { runValidators: true }
            );

            product = await Product.findById(existingProduct._id);

            console.log(`↻ Updated product: ${item.slug}`);
        } else {
            product = await Product.create(productPayload);

            console.log(`✓ Created product: ${item.slug}`);
        }

        const variants = buildVariants(
            item,
            index >= productsData.length - 4
        );

        for (const variantData of variants) {
            const existingVariant = await Variant.findOne(
                {
                    product_id: product._id,
                    size: variantData.size,
                    fabric_type: variantData.fabric_type,
                },
                null,
                { includeDeleted: true }
            );

            let variant;

            const variantPayload = {
                product_id: product._id,
                sku: variantData.sku,
                size: variantData.size,
                fabric_type: variantData.fabric_type,
                stock: variantData.stock,
                status: product.status,
                is_deleted: false,
                deleted_at: null,
            };

            if (existingVariant) {
                await Variant.updateOne(
                    { _id: existingVariant._id },
                    { $set: variantPayload },
                    { runValidators: true }
                );

                variant = await Variant.findById(existingVariant._id);

                console.log(`  ↻ Updated variant: ${variantData.sku}`);
            } else {
                variant = await Variant.create(variantPayload);

                console.log(`  ✓ Created variant: ${variantData.sku}`);
            }

            for (const unitData of variantData.units) {
                VariantUnit.validatePriceTiers(unitData.price_tiers);
                VariantUnit.validatePromotion(
                    unitData.promotion,
                    unitData.price_tiers
                );

                const existingUnit = await VariantUnit.findOne({
                    variant_id: variant._id,
                    pack_size: unitData.pack_size,
                });

                const unitPayload = {
                    variant_id: variant._id,
                    unit_type: unitData.unit_type,
                    display_name: unitData.display_name,
                    pack_size: unitData.pack_size,
                    price_tiers: unitData.price_tiers,
                    promotion: unitData.promotion,
                    min_order_qty: unitData.min_order_qty,
                    max_order_qty: unitData.max_order_qty,
                    qty_step: unitData.qty_step,
                    is_default: unitData.is_default,
                    currency: unitData.currency,
                };

                if (existingUnit) {
                    await VariantUnit.updateOne(
                        { _id: existingUnit._id },
                        { $set: unitPayload },
                        { runValidators: true }
                    );

                    console.log(
                        `    ↻ Updated unit: ${unitData.display_name}`
                    );
                } else {
                    await VariantUnit.create(unitPayload);

                    console.log(
                        `    ✓ Created unit: ${unitData.display_name}`
                    );
                }
            }

            await Variant.updatePriceCache(variant._id);
        }

        await Product.updatePriceCache(product._id);
    }

    for (const item of simpleProductsData) {
        const categoryId = categoryMap.get(item.category_slug);
        await seedSimpleProduct(item, categoryId);
    }

    console.log("✓ Products seeding completed");
};

if (require.main === module) {
    require("dotenv").config();

    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    const run = async () => {
        try {
            await mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_dev",
            });

            console.log("✓ MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedProducts();
        } catch (err) {
            console.error("✗ Product seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("✓ MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedProducts;
