const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const UploadController = require('./upload.controller');
const {
    cloudinaryAvatarSignatureBodySchema,
    cloudinarySignatureBodySchema,
} = require('./upload.validator');
const { ROLES } = require('../../constants/roles');

const router = express.Router();

router.post(
    '/cloudinary/signature',
    authenticate,
    authorize([ROLES.ADMIN, ROLES.MANAGER]),
    validate({ body: cloudinarySignatureBodySchema }),
    UploadController.createCloudinarySignature
);

router.post(
    '/cloudinary/avatar-signature',
    authenticate,
    validate({ body: cloudinaryAvatarSignatureBodySchema }),
    (req, res, next) => {
        req.body.asset_type = 'avatar';
        req.body.folder = 'avatars';
        req.body.tags = ['avatar', 'user'];
        req.body.overwrite = true;
        req.body.invalidate = true;

        return UploadController.createCloudinarySignature(req, res, next);
    }
);

module.exports = router;
