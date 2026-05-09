const { ZodError } = require('zod');
const AppError = require('../utils/appError.util');

const validate = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body || {});

            return next();

        } catch (error) {

            if (error instanceof ZodError) {

                const messages = error.issues.map((issue) => {
                    const path = issue.path.join('.');

                    return path
                        ? `${path}: ${issue.message}`
                        : issue.message;
                });

                return next(
                    new AppError(
                        messages.join('; '),
                        400,
                        'VALIDATION_ERROR'
                    )
                );
            }

            return next(error);
        }
    };
};

module.exports = validate;