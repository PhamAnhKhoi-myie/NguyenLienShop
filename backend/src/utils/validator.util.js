const mongoose = require("mongoose");
const AppError = require("./appError.util");

const validateObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid user id", 400, "INVALID_ID");
    }
};

const whitelistFields = (data, allowedFields) => {
    return Object.fromEntries(
        Object.entries(data).filter(([key]) =>
            allowedFields.includes(key)
        )
    );
};
module.exports = { validateObjectId, whitelistFields };