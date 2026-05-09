const express = require('express');
const router = express.Router();
const auditLogController = require('./audit_log.controller');
const { authorize } = require('../../middlewares/authorize.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles');

// TẤT CẢ API LIÊN QUAN ĐẾN LOG ĐỀU PHẢI ĐƯỢC BẢO VỆ
// Chỉ những người đã đăng nhập (protect) và có quyền ADMIN mới được xem
router.use(authenticate);
router.use(authorize([ROLES.ADMIN]));

// Routes
router.route('/')
    .get(auditLogController.getAllLogs);

router.route('/:id')
    .get(auditLogController.getLogById);

module.exports = router;