const asyncHandler = require('../../utils/asyncHandler.util');
const UploadService = require('./upload.service');

const createCloudinarySignature = asyncHandler(async (req, res) => {
    const result = UploadService.createCloudinarySignature(req.body);

    return res.status(201).json({
        success: true,
        data: result,
    });
});

module.exports = {
    createCloudinarySignature,
};
