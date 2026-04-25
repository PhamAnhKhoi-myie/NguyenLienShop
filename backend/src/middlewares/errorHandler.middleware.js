const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        code: err.code || "INTERNAL_ERROR",
        message: err.message,
    });
};

module.exports = errorHandler;