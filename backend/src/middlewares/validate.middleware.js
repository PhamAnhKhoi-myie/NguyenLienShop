const { ZodError } = require('zod');
const AppError = require('../utils/appError.util');

/**
 * Validation middleware using Zod schemas
 * Parses req.body and throws AppError on validation failure
 * 
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/', validate(createUserSchema), createUserController);
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Parse and validate request body
            req.body = schema.parse(req.body || {});
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Extract validation error messages
                const messages = error.issues.map((issue) => {
                    const path = issue.path.join('.');
                    return `${path}: ${issue.message}`;
                });

                throw new AppError(
                    messages.join('; '),
                    400,
                    'VALIDATION_ERROR'
                );
            }
            next(error);
        }
    };
};

module.exports = validate;