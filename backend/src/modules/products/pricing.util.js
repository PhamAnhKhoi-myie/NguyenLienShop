const toDate = (value) => {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isPromotionActive = (promotion, at = new Date()) => {
    if (!promotion?.enabled || !promotion.type || !promotion.value) {
        return false;
    }

    const current = toDate(at) || new Date();
    const startsAt = toDate(promotion.starts_at);
    const endsAt = toDate(promotion.ends_at);

    if (startsAt && current < startsAt) {
        return false;
    }

    if (endsAt && current > endsAt) {
        return false;
    }

    return true;
};

const calculatePromotionalPrice = (
    originalUnitPrice,
    promotion,
    at = new Date()
) => {
    const originalPrice = Math.round(Number(originalUnitPrice) || 0);
    const active = originalPrice > 0 && isPromotionActive(promotion, at);

    if (!active) {
        return {
            original_unit_price: originalPrice,
            unit_price: originalPrice,
            promotion_discount_amount: 0,
            promotion_discount_percent: 0,
            is_on_sale: false,
            voucher_allowed: true,
        };
    }

    let unitPrice = originalPrice;
    if (promotion.type === 'PERCENT') {
        unitPrice = Math.round(
            originalPrice * (100 - Number(promotion.value)) / 100
        );
    } else if (promotion.type === 'FIXED') {
        unitPrice = originalPrice - Number(promotion.value);
    }

    unitPrice = Math.max(1, Math.round(unitPrice));
    const discountAmount = originalPrice - unitPrice;

    return {
        original_unit_price: originalPrice,
        unit_price: unitPrice,
        promotion_discount_amount: discountAmount,
        promotion_discount_percent: Math.round(
            discountAmount * 100 / originalPrice
        ),
        is_on_sale: discountAmount > 0,
        voucher_allowed: promotion.allow_voucher !== false,
    };
};

const calculatePrice = (
    qty,
    priceTiers,
    packSize,
    promotion,
    at = new Date()
) => {
    const tier = priceTiers.find(
        (item) =>
            qty >= item.min_qty &&
            (item.max_qty === null ||
                item.max_qty === undefined ||
                qty <= item.max_qty)
    );

    if (!tier) {
        throw new Error(`No matching price tier for quantity: ${qty}`);
    }

    const promotionalPrice = calculatePromotionalPrice(
        tier.unit_price,
        promotion,
        at
    );
    const totalItems = qty * packSize;

    return {
        qty_packs: qty,
        ...promotionalPrice,
        original_total_price:
            qty * promotionalPrice.original_unit_price,
        total_price: qty * promotionalPrice.unit_price,
        total_items: totalItems,
        original_price_per_unit: Math.round(
            promotionalPrice.original_unit_price / packSize
        ),
        price_per_unit: Math.round(
            promotionalPrice.unit_price / packSize
        ),
    };
};

const summarizePriceTiers = (
    priceTiers = [],
    packSize = 1,
    promotion,
    at = new Date()
) => {
    if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
        return {
            min_price: 0,
            max_price: 0,
            original_min_price: 0,
            original_max_price: 0,
            min_price_per_unit: 0,
            max_price_per_unit: 0,
            original_min_price_per_unit: 0,
            original_max_price_per_unit: 0,
            is_on_sale: false,
            max_discount_percent: 0,
        };
    }

    const prices = priceTiers.map((tier) =>
        calculatePromotionalPrice(tier.unit_price, promotion, at)
    );
    const effectivePrices = prices.map((item) => item.unit_price);
    const originalPrices = prices.map(
        (item) => item.original_unit_price
    );

    return {
        min_price: Math.min(...effectivePrices),
        max_price: Math.max(...effectivePrices),
        original_min_price: Math.min(...originalPrices),
        original_max_price: Math.max(...originalPrices),
        min_price_per_unit: Math.round(
            Math.min(...effectivePrices) / packSize
        ),
        max_price_per_unit: Math.round(
            Math.max(...effectivePrices) / packSize
        ),
        original_min_price_per_unit: Math.round(
            Math.min(...originalPrices) / packSize
        ),
        original_max_price_per_unit: Math.round(
            Math.max(...originalPrices) / packSize
        ),
        is_on_sale: prices.some((item) => item.is_on_sale),
        max_discount_percent: Math.max(
            ...prices.map((item) => item.promotion_discount_percent)
        ),
    };
};

const toPromotionDTO = (promotion, at = new Date()) => ({
    enabled: Boolean(promotion?.enabled),
    type: promotion?.type || 'FIXED',
    value: Number(promotion?.value || 0),
    starts_at: promotion?.starts_at || null,
    ends_at: promotion?.ends_at || null,
    allow_voucher: promotion?.allow_voucher !== false,
    is_active: isPromotionActive(promotion, at),
});

module.exports = {
    calculatePrice,
    calculatePromotionalPrice,
    isPromotionActive,
    summarizePriceTiers,
    toPromotionDTO,
};
