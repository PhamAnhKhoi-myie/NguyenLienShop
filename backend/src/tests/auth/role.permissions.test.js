const { assertRole } = require('../../utils/auth.util');
const { resolveActorType } = require('../../utils/audit.util');
const {
    ADMIN_ONLY_ROLES,
    ORDER_MANAGER_ROLES,
    SHIPMENT_MANAGER_ROLES,
    FINANCE_VIEW_ROLES,
    FINANCE_ADMIN_ROLES,
    SYSTEM_ADMIN_ROLES,
} = require('../../constants/roles');

const userWithRole = (role) => ({ userId: 'user-id', roles: [role] });

describe('staff permission groups', () => {
    test.each([
        ['orders', ORDER_MANAGER_ROLES],
        ['shipments', SHIPMENT_MANAGER_ROLES],
        ['finance view', FINANCE_VIEW_ROLES],
    ])('MANAGER can access %s', (_name, allowedRoles) => {
        expect(assertRole(userWithRole('MANAGER'), allowedRoles)).toBeDefined();
    });

    test.each([
        ['admin only', ADMIN_ONLY_ROLES],
        ['finance admin', FINANCE_ADMIN_ROLES],
        ['system admin', SYSTEM_ADMIN_ROLES],
    ])('MANAGER cannot access %s', (_name, allowedRoles) => {
        expect(() => assertRole(userWithRole('MANAGER'), allowedRoles)).toThrow(
            expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' })
        );
    });

    test('ADMIN remains allowed in operational and sensitive groups', () => {
        const admin = userWithRole('ADMIN');

        expect(assertRole(admin, ORDER_MANAGER_ROLES)).toBe(admin);
        expect(assertRole(admin, FINANCE_ADMIN_ROLES)).toBe(admin);
        expect(assertRole(admin, SYSTEM_ADMIN_ROLES)).toBe(admin);
    });

    test('CUSTOMER cannot access staff operations', () => {
        expect(() =>
            assertRole(userWithRole('CUSTOMER'), ORDER_MANAGER_ROLES)
        ).toThrow(expect.objectContaining({ statusCode: 403 }));
    });
});

describe('audit actor type', () => {
    test.each([
        ['ADMIN', 'ADMIN'],
        ['MANAGER', 'MANAGER'],
        ['CUSTOMER', 'USER'],
    ])('records %s actors as %s', (role, actorType) => {
        expect(resolveActorType(userWithRole(role))).toBe(actorType);
    });
});
