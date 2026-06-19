const { z } = require('zod');

const dashboardStatsQuerySchema = z
    .object({
        date_from: z.string().trim().optional(),
        date_to: z.string().trim().optional(),
        granularity: z.enum(['day', 'month']).optional(),
    })
    .strict();

module.exports = {
    dashboardStatsQuerySchema,
};
