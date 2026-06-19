import { translate } from '../../../shared/i18n/index';

export const BLOG_CONTENT_TYPES = ['POLICY', 'GUIDE', 'FAQ', 'ARTICLE', 'SUPPORT_PAGE'];

export const BLOG_CONTENT_TYPE_BADGE_VARIANTS = {
    POLICY: 'warning',
    GUIDE: 'success',
    FAQ: 'accent',
    ARTICLE: 'primary',
    SUPPORT_PAGE: 'muted',
};

export function getBlogContentTypeLabel(type) {
    const labels = {
        POLICY: translate('text.policy'),
        GUIDE: translate('text.guide'),
        FAQ: translate('text.faq'),
        ARTICLE: translate('text.article'),
        SUPPORT_PAGE: translate('text.support_page'),
    };

    return labels[type] || labels.ARTICLE;
}

export const blogContentTypeOptions = BLOG_CONTENT_TYPES.map((type) => ({
    value: type,
    label: getBlogContentTypeLabel(type),
}));

export const blogContentTypeFilterOptions = [
    { value: '', label: translate('text.all_content') },
    ...blogContentTypeOptions,
];
