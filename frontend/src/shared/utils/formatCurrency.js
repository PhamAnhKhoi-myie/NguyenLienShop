export function formatCurrency(value, currency = 'VND') {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}
