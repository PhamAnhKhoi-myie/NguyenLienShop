const mongoose = require("mongoose");
const AppError = require("../utils/appError.util");

const validateObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid user id", 400, "INVALID_ID");
    }
};

module.exports = { validateObjectId };