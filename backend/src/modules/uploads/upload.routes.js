const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const UploadController = require('./upload.controller');
const { cloudinarySignatureBodySchema } = require('./upload.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.post(
    '/cloudinary/signature',
    authenticate,
    authorize([ROLES.ADMIN, ROLES.MANAGER]),
    validate({ body: cloudinarySignatureBodySchema }),
    UploadController.createCloudinarySignature
);

module.exports = router;
