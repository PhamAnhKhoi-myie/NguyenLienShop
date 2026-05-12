const express = require("express");

const userController = require("./user.controller");

const validate = require("../../middlewares/validate.middleware");

const {
    authorize,
    checkOwnershipOrAdmin
} = require("../../middlewares/authorize.middleware");

const {
    authenticate
} = require("../../middlewares/auth.middleware");

const {
    updateUserBodySchema,
    updateUserRolesBodySchema,
    updateUserStatusBodySchema,
    idParamSchema,
    getAllUsersQuerySchema
} = require("./user.validator");

const router = express.Router();

// ===== CURRENT USER =====
router.get(
    "/me",
    authenticate,
    userController.getMe
);

// ===== ADMIN ONLY =====
router.get(
    "/",
    authenticate,
    authorize(["ADMIN"]),
    validate({ query: getAllUsersQuerySchema }),
    userController.getAllUsers
);

router.patch(
    "/:id/status",
    authenticate,
    authorize(["ADMIN"]),
    validate({ params: idParamSchema, body: updateUserStatusBodySchema }),
    userController.updateUserStatus
);

router.patch(
    "/:id/roles",
    authenticate,
    authorize(["ADMIN"]),
    validate({ params: idParamSchema, body: updateUserRolesBodySchema }),
    userController.updateUserRoles
);

// ===== UPDATE USER =====
router.patch(
    "/:id",
    authenticate,
    checkOwnershipOrAdmin(),
    validate({ params: idParamSchema, body: updateUserBodySchema }),
    userController.updateUser
);

// ===== DELETE USER =====
router.delete(
    "/:id",
    authenticate,
    checkOwnershipOrAdmin(),
    validate({ params: idParamSchema }),
    userController.deleteUser
);

module.exports = router;