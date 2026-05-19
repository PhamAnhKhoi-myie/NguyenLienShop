const { z } = require('zod');
const mongoose = require('mongoose');

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid MongoDB ObjectId' }
);

const createSessionBodySchema = z.object({
    title: z.string().trim().min(1).max(100).optional(),
}).strict();

const sendMessageBodySchema = z.object({
    session_id: objectIdSchema,
    message: z.string().trim().min(1).max(1000),
}).strict();

module.exports = {
    createSessionBodySchema,
    sendMessageBodySchema,
};
