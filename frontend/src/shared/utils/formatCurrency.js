import { getLocale } from '../i18n/index';
export function formatCurrency(value, currency = 'VND') {
    const amount = Number(value || 0);

    return new Intl.NumberFormat(getLocale(), {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}
