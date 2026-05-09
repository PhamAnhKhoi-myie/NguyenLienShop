const buildAuditMetadata = (req) => ({
    ip: req.ip,
    userAgent: req.headers['user-agent']
});

module.exports = { buildAuditMetadata };