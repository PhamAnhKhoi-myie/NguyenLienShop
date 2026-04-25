const whitelistFields = (data, allowedFields) => {
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );
};

module.exports = { whitelistFields };