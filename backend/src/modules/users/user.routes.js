const express = require("express");
const userController = require("./user.controller");
const { updateUserSchema } = require("./user.validator");
const { authorize } = require("../../middlewares/authorize.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware")

const router = express.Router();

router.get("/me", authenticate, userController.getMe);

router.get("/", authenticate, authorize(["ADMIN"]), userController.getAllUsers);

router.patch(
    '/:id',
    authenticate,
    validate(updateUserSchema),
    userController.updateUser
);

router.delete("/:id", authenticate, userController.deleteUser);

router.patch(
    "/:id/roles",
    authenticate,
    authorize(["ADMIN"]),
    userController.updateUserRoles
);

module.exports = router;