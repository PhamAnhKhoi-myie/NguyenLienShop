import { z } from 'zod';

export const cancelOrderSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(5, 'Vui lòng nhập lý do ít nhất 5 ký tự')
        .max(300, 'Lý do hủy không vượt quá 300 ký tự'),
});

export const reviewSchema = z.object({
    rating: z.coerce
        .number()
        .int('Số sao không hợp lệ')
        .min(1, 'Số sao tối thiểu là 1')
        .max(5, 'Số sao tối đa là 5'),
    comment: z
        .string()
        .trim()
        .min(10, 'Nội dung đánh giá cần ít nhất 10 ký tự')
        .max(500, 'Nội dung đánh giá không vượt quá 500 ký tự'),
});
