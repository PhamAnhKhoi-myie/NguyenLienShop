const resolveActorType = (user) => {
    const roles = (user?.roles || []).map((role) => String(role).toUpperCase());

    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    return user?.userId ? 'USER' : null;
};

const buildAuditMetadata = (req) => ({
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    actorType: resolveActorType(req.user),
});

module.exports = { buildAuditMetadata, resolveActorType };
