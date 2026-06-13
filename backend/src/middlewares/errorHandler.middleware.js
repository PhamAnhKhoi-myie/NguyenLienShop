const AppError = require("../utils/appError.util");

const errorHandler = (err, req, res, next) => {

    console.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
    });


    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
        });
    }


    return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
    });
};

module.exports = errorHandler;