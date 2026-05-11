const buildAuditMetadata = (req) => ({
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent'] || null
});

module.exports = { buildAuditMetadata };