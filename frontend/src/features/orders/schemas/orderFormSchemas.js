import { translate } from '../../../shared/i18n/index';
import { z } from 'zod';

export const cancelOrderSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(5, translate('text.please_enter_reason_in_at_least_5_characters'))
        .max(300, translate('text.cancellation_reason_cannot_exceed_300_characters')),
});

export const reviewSchema = z.object({
    rating: z.coerce
        .number()
        .int(translate('text.invalid_number_of_stars'))
        .min(1, translate('text.minimum_number_of_stars_is_1'))
        .max(5, translate('text.maximum_number_of_stars_is_5')),
    title: z
        .string()
        .trim()
        .max(200, translate('text.review_title_must_not_exceed_200_characters'))
        .optional(),
    comment: z
        .string()
        .trim()
        .min(10, translate('text.review_content_must_be_at_least_10_characters'))
        .max(500, translate('text.review_content_must_not_exceed_500_characters')),
});
