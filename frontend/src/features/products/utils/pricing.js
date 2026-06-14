export function findTierForQuantity(unit, quantity) {
    const tiers = unit?.price_tiers || [];
    const selectedQuantity = Number(quantity || 0);

    return (
        tiers.find(
            (tier) =>
                selectedQuantity >= Number(tier.min_qty || 1) &&
                (!tier.max_qty || selectedQuantity <= Number(tier.max_qty))
        ) ||
        tiers[0] ||
        null
    );
}

export function getTierUnitPrice(tier) {
    const unitPrice = Number(tier?.unit_price || 0);

    return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
}

export function getTierOriginalUnitPrice(tier) {
    const unitPrice = getTierUnitPrice(tier);
    const originalUnitPrice = Number(tier?.original_unit_price || 0);

    return Number.isFinite(originalUnitPrice) && originalUnitPrice > unitPrice
        ? originalUnitPrice
        : 0;
}

export function calculateOrderTotal(tier, quantity) {
    const selectedQuantity = Number(quantity || 0);

    if (!selectedQuantity) {
        return 0;
    }

    return getTierUnitPrice(tier) * selectedQuantity;
}

export function calculateOriginalOrderTotal(tier, quantity) {
    const selectedQuantity = Number(quantity || 0);
    const originalUnitPrice = getTierOriginalUnitPrice(tier);

    if (!selectedQuantity || !originalUnitPrice) {
        return 0;
    }

    return originalUnitPrice * selectedQuantity;
}
