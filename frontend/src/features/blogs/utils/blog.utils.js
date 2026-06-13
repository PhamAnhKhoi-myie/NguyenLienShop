import { getLocale } from '../../../shared/i18n/index';
export function formatBlogDate(value) {
    if (!value) {
        return '';
    }

    return new Intl.DateTimeFormat(getLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

export function stripHtml(value = '') {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
