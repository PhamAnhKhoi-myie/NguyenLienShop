const { ZodError } = require('zod');
const AppError = require('../utils/appError.util');

const validate = (schemas) => {
    return (req, res, next) => {
        try {
            // BODY
            if (schemas.body) {
                req.body = schemas.body.parse(req.body || {});
            }

            // QUERY
            if (schemas.query) {
                req.query = schemas.query.parse(req.query || {});
            }

            // PARAMS
            if (schemas.params) {
                req.params = schemas.params.parse(req.params || {});
            }

            next();
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