const ChatService = require('./chat.service');
const ProductService = require('../products/product.service');
const { ChatSession } = require('./chat.model');
const { CHAT_INTENTS, CHAT_RELATED_TYPES } = require('./chat.constants');
const asyncHandler = require('../../utils/asyncHandler.util');
const AppError = require('../../utils/appError.util');
const OrderService = require('../orders/order.service');
const ShopInfoService = require('../shop_info/shop_info.service');
const { getDefaultShippingFee } = require('../../config/commerce');
const {
    isPayPalCheckoutEnabled,
    isPayOSCheckoutEnabled,
    isVNPayCheckoutEnabled,
} = require('../payments/payment_provider.util');

const DEFAULT_QUICK_REPLIES = [
    'Tìm túi bao xoài',
    'Hỏi phí ship',
    'Kiểm tra đơn hàng',
];

const PRODUCT_QUICK_REPLIES = [
    'Còn mẫu nào khác không?',
    'Hỏi phí ship',
    'Kiểm tra đơn hàng',
];

const SUPPORT_QUICK_REPLIES = [
    'Chat Zalo',
    'Gọi shop',
    'Tìm sản phẩm khác',
];

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const formatPriceRange = (product) => {
    const min = Number(product?.min_price || 0);
    const max = Number(product?.max_price || 0);

    if (!min && !max) {
        return 'liên hệ để báo giá';
    }

    if (min === max || !max) {
        return formatCurrency(min);
    }

    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
};

const orderStatusLabels = {
    PENDING: 'đang chờ xác nhận/thanh toán',
    PAID: 'đã thanh toán, đang chờ xử lý',
    PROCESSING: 'đang được chuẩn bị',
    SHIPPED: 'đang giao đến bạn',
    DELIVERED: 'đã giao thành công',
    FAILED: 'thanh toán thất bại',
    CANCELED: 'đã hủy',
};

const paymentStatusLabels = {
    PENDING: 'chờ thanh toán',
    PAID: 'đã thanh toán',
    FAILED: 'thanh toán thất bại',
    REFUND_PENDING: 'đang chờ hoàn tiền',
    REFUNDED: 'đã hoàn tiền',
};

const normalizeZaloLink = (zalo, phone) => {
    if (zalo && /^https?:\/\//i.test(zalo)) {
        return zalo;
    }

    const source = zalo || phone;
    const digits = String(source || '').replace(/\D/g, '');

    return digits ? `https://zalo.me/${digits}` : null;
};

const getShopSupportData = async () => {
    try {
        const shopInfo = await ShopInfoService.getShopInfo();

        return {
            shop_name: shopInfo.shop_name,
            phone: shopInfo.phone,
            email: shopInfo.email,
            address: shopInfo.address,
            shipping_partner: shopInfo.shipping_partner,
            zalo: normalizeZaloLink(
                shopInfo.social_links?.zalo,
                shopInfo.phone
            ),
        };
    } catch (error) {
        return {
            shop_name: 'NguyenLienShop',
            phone: '0900000000',
            email: null,
            address: null,
            shipping_partner: null,
            zalo: 'https://zalo.me/0900000000',
        };
    }
};

const buildProductsRelatedData = (items, query) => ({
    type: CHAT_RELATED_TYPES.PRODUCTS,
    query,
    count: items.length,
    items,
});

const buildOrderRelatedData = (order) => ({
    type: CHAT_RELATED_TYPES.ORDER,
    item: order,
});

const buildPolicyRelatedData = (topic, item, support) => ({
    type: CHAT_RELATED_TYPES.POLICY,
    topic,
    item,
    support,
});

const buildSupportRelatedData = (support) => ({
    type: CHAT_RELATED_TYPES.SUPPORT,
    item: support,
});

const buildPaymentMethods = () => {
    const methods = ['COD'];

    if (isVNPayCheckoutEnabled()) {
        methods.push('VNPAY');
    }

    if (isPayOSCheckoutEnabled()) {
        methods.push('PayOS');
    }

    if (isPayPalCheckoutEnabled()) {
        methods.push('PayPal');
    }

    return methods;
};

const buildProductSearchReply = (products, query, intent) => {
    if (products.length === 0) {
        return `Mình chưa tìm thấy sản phẩm khớp với "${query}". Bạn có thể mô tả thêm kích thước, chất liệu hoặc nhắn Zalo để shop kiểm tra giúp nhé.`;
    }

    const firstProduct = products[0];
    const stockText = firstProduct.in_stock ? 'còn hàng' : 'đang hết hàng';
    const priceText = formatPriceRange(firstProduct);

    if (intent === CHAT_INTENTS.ASK_PRICE) {
        return products.length === 1
            ? `${firstProduct.name} hiện có giá ${priceText} và ${stockText}. Mình gửi card sản phẩm bên dưới để bạn xem nhanh nhé.`
            : `Mình tìm thấy ${products.length} sản phẩm phù hợp. Mẫu gần nhất là ${firstProduct.name}, giá ${priceText} và ${stockText}. Bạn xem các card bên dưới nhé.`;
    }

    return `Mình tìm thấy ${products.length} sản phẩm phù hợp với "${query}". Bạn xem nhanh các lựa chọn bên dưới nhé.`;
};

class ChatController {
    static handleMessage = asyncHandler(async (req, res) => {
        const { message, session_id } = req.body;
        const userId = req.user.id;

        const session = await ChatSession.findOne({ _id: session_id, user_id: userId });
        if (!session) {
            throw new AppError("Chat session does not exist", 404, 'CHAT_SESSION_NOT_FOUND');
        }

        const aiResult = await ChatService.processUserMessage(userId, session_id, message);
        const { intent, confidence } = aiResult.parsed_data;

        let replyText = 'Mình chưa chắc thông tin này. Bạn có muốn shop hỗ trợ nhanh qua Zalo không?';
        let relatedData = null;
        let quickReplies = DEFAULT_QUICK_REPLIES;

        switch (intent) {
            case CHAT_INTENTS.GREETING: {
                replyText = 'Chào bạn, mình là trợ lý bán hàng của NguyenLienShop. Bạn cần tìm loại túi, bao hoặc màng bọc nào hôm nay?';
                break;
            }

            case CHAT_INTENTS.ASK_PRICE:
            case CHAT_INTENTS.SEARCH_PRODUCT: {
                const productName = aiResult.parsed_data.entities.product?.trim();

                if (!productName) {
                    replyText = 'Bạn cho mình tên sản phẩm hoặc nhu cầu sử dụng nhé, ví dụ: túi bao xoài, túi bao trái cây, màng bọc thực phẩm.';
                    quickReplies = ['Tìm túi bao xoài', 'Tìm túi bao trái cây', 'Hỏi phí ship'];
                    break;
                }

                const limit = intent === CHAT_INTENTS.ASK_PRICE ? 3 : 5;
                const products = await ProductService.searchProducts(productName, limit);

                replyText = buildProductSearchReply(products, productName, intent);
                relatedData =
                    products.length > 0
                        ? buildProductsRelatedData(products, productName)
                        : buildSupportRelatedData(await getShopSupportData());
                quickReplies = products.length > 0 ? PRODUCT_QUICK_REPLIES : SUPPORT_QUICK_REPLIES;
                break;
            }

            case CHAT_INTENTS.ORDER_STATUS: {
                const latestOrder = await OrderService.getLatestOrderByUser(userId);

                if (latestOrder) {
                    const status = String(latestOrder.status || '').toUpperCase();
                    const paymentStatus = String(latestOrder.payment_status || '').toUpperCase();
                    const statusText = orderStatusLabels[status] || latestOrder.status || 'chưa xác định';
                    const paymentText =
                        paymentStatusLabels[paymentStatus] ||
                        latestOrder.payment_status ||
                        'chưa rõ';

                    replyText = `Đơn ${latestOrder.order_code || `#${latestOrder.id.slice(-6)}`} hiện ${statusText}. Tổng tiền là ${formatCurrency(latestOrder.total_amount)} và trạng thái thanh toán là ${paymentText}.`;
                    relatedData = buildOrderRelatedData(latestOrder);
                    quickReplies = ['Xem đơn hàng', 'Hỏi phí ship', 'Chat Zalo'];
                } else {
                    replyText = 'Mình kiểm tra thấy tài khoản của bạn chưa có đơn hàng nào. Bạn muốn mình tìm sản phẩm để đặt hàng không?';
                    quickReplies = ['Tìm túi bao xoài', 'Tìm sản phẩm bán chạy', 'Chat Zalo'];
                }
                break;
            }

            case CHAT_INTENTS.SHIPPING_POLICY: {
                const support = await getShopSupportData();
                const defaultShippingFee = getDefaultShippingFee();
                const feeText =
                    defaultShippingFee > 0
                        ? `Phí vận chuyển mặc định hiện là ${formatCurrency(defaultShippingFee)} và có thể được điều chỉnh theo địa chỉ/ưu đãi khi checkout.`
                        : 'Phí vận chuyển sẽ được tính hoặc xác nhận ở bước checkout theo địa chỉ giao hàng.';
                const partnerText = support.shipping_partner
                    ? ` qua ${support.shipping_partner}`
                    : '';

                replyText = `Shop hỗ trợ giao hàng toàn quốc${partnerText}. ${feeText} Nếu bạn cần báo phí nhanh, hãy gửi tỉnh/thành và sản phẩm muốn mua nhé.`;
                relatedData = buildPolicyRelatedData(
                    'shipping',
                    {
                        shipping_partner: support.shipping_partner,
                        default_shipping_fee: defaultShippingFee,
                    },
                    support
                );
                quickReplies = ['Tìm sản phẩm', 'Kiểm tra đơn hàng', 'Chat Zalo'];
                break;
            }

            case CHAT_INTENTS.PAYMENT_POLICY: {
                const support = await getShopSupportData();
                const methods = buildPaymentMethods();

                replyText = `Shop hỗ trợ ${methods.join(', ')}. COD luôn có sẵn; các phương thức online sẽ hiển thị ở checkout khi hệ thống đang bật.`;
                relatedData = buildPolicyRelatedData(
                    'payment',
                    { methods },
                    support
                );
                quickReplies = ['Tìm sản phẩm', 'Hỏi phí ship', 'Chat Zalo'];
                break;
            }

            case CHAT_INTENTS.RETURN_POLICY: {
                const support = await getShopSupportData();

                replyText = 'Với đổi trả hoặc hoàn tiền, shop cần kiểm tra tình trạng đơn hàng và hình ảnh sản phẩm trước khi xác nhận. Bạn gửi mã đơn và hình ảnh qua Zalo để shop hỗ trợ nhanh nhé.';
                relatedData = buildPolicyRelatedData(
                    'return',
                    {
                        requires_order_check: true,
                        requires_product_evidence: true,
                    },
                    support
                );
                quickReplies = ['Kiểm tra đơn hàng', 'Chat Zalo', 'Tìm sản phẩm khác'];
                break;
            }

            default: {
                const support = await getShopSupportData();

                replyText = 'Mình chưa chắc thông tin này. Bạn có thể hỏi tên sản phẩm, giá/tồn kho, phí ship, thanh toán hoặc kiểm tra đơn hàng; nếu cần người hỗ trợ ngay thì bấm Zalo nhé.';
                relatedData = buildSupportRelatedData(support);
                quickReplies = SUPPORT_QUICK_REPLIES;
            }
        }

        const assistantMessage = await ChatService.saveAssistantMessage(
            session_id,
            replyText,
            aiResult
        );

        res.status(200).json({
            success: true,
            data: {
                id: assistantMessage._id.toString(),
                session_id,
                role: 'assistant',
                content: replyText,
                intent,
                confidence,
                related_data: relatedData,
                quick_replies: quickReplies,
                created_at: assistantMessage.created_at,
            }
        });
    });

    static createSession = asyncHandler(async (req, res) => {
        const session = await ChatSession.create({
            user_id: req.user.id,
            title: req.body.title || 'Tư vấn bán hàng'
        });

        res.status(201).json({
            success: true,
            data: session
        });
    });
}

module.exports = ChatController;
