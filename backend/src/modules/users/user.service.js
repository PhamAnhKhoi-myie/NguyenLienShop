const User = require('./user.model');
const UserMapper = require('./user.mapper');
const AppError = require('../../utils/appError.util');
const { ALL_ROLES } = require('../../constants/roles');
const UserAuditLogService = require('../audit_logs/user_audit_log/user_audit_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');
const LoyaltyService = require('../loyalty/loyalty.service');

class UserService {
    static async getUserById(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return UserMapper.toResponseDTO(user);
    }

    static async getMe(userId) {
        await LoyaltyService.applyTierDecayForUser(userId);
        return UserService.getUserById(userId);
    }

    static async getAllUsers(page = 1, limit = 20, search = null, status = null) {
        const skip = (page - 1) * limit;
        const filter = {};

        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { 'profile.full_name': { $regex: search, $options: 'i' } },
                { 'profile.phone_number': { $regex: search, $options: 'i' } },
            ];
        }

        if (status) {
            filter.status = status;
        }

        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ created_at: -1 });

        return {
            data: UserMapper.toResponseDTOList(users),
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                per_page: limit,
            },
        };
    }

    static async updateUserProfile(userId, updateData, actorId, metadata = {}) {
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }


        const existingUser = await User.findById(userId);

        if (!existingUser) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }


        const oldData = {
            email: existingUser.email,
            full_name: existingUser.profile?.full_name || null,
            phone_number: existingUser.profile?.phone_number || null,
            avatar_url: existingUser.profile?.avatar_url || null,
            gender: existingUser.profile?.gender || 'UNSPECIFIED',
        };


        const newData = {
            email: updateData.email ?? oldData.email,
            full_name: updateData["profile.full_name"] ?? oldData.full_name,
            phone_number: updateData["profile.phone_number"] ?? oldData.phone_number,
            avatar_url: updateData["profile.avatar_url"] ?? oldData.avatar_url,
            gender: updateData["profile.gender"] ?? oldData.gender,
        };


        const changes = {};

        for (const key in newData) {
            if (oldData[key] !== newData[key]) {
                changes[key] = {
                    from: oldData[key],
                    to: newData[key],
                };
            }
        }


        if (Object.keys(changes).length === 0) {
            throw new AppError('No change detected', 400, 'NO_CHANGE');
        }


        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );


        try {
            await UserAuditLogService.createLog({
                actor_id: actorId,
                action: AUDIT_ACTIONS.UPDATE_USER_PROFILE,
                user_id: userId,
                changes,
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
            });
        } catch (error) {
            console.error('Audit log failed:', error);
        }

        return UserMapper.toResponseDTO(updated);
    }

    static async deleteUser(userId, actorId, metadata = {}) {


        const existingUser = await User.findById(userId);

        if (!existingUser) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }


        if (existingUser.deleted_at) {
            throw new AppError(
                'User already deleted',
                400,
                'ALREADY_DELETED'
            );
        }

        const now = new Date();


        const deleted = await User.findOneAndUpdate(
            {
                _id: userId,
                deleted_at: null,
            },
            {
                deleted_at: now,
                deleted_by: actorId,
            },
            {
                new: true,
            }
        );

        if (!deleted) {
            throw new AppError(
                'User not found',
                404,
                'USER_NOT_FOUND'
            );
        }


        try {
            await UserAuditLogService.createLog({
                actor_id: actorId,
                action: AUDIT_ACTIONS.DELETE_USER_SOFT,
                user_id: userId,
                changes: {
                    deleted_at: {
                        from: null,
                        to: now,
                    },
                },
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
            });
        } catch (error) {
            console.error('Audit log failed:', error);
        }

        return UserMapper.toResponseDTO(deleted);
    }

    static async updateUserRoles(userId, roles, adminId, metadata = {}) {


        if (!Array.isArray(roles) || roles.length === 0) {
            throw new AppError(
                'Roles must be a non-empty array',
                400,
                'VALIDATION_ERROR'
            );
        }

        const invalidRoles = roles.filter(
            (role) => !ALL_ROLES.includes(role)
        );

        if (invalidRoles.length > 0) {
            throw new AppError(
                `Invalid roles: ${invalidRoles.join(', ')}`,
                400,
                'INVALID_ROLE'
            );
        }


        roles = [...new Set(roles)];

        const existingUser = await User.findOne({
            _id: userId,
            deleted_at: null,
        });

        if (!existingUser) {
            throw new AppError(
                'User not found',
                404,
                'USER_NOT_FOUND'
            );
        }

        const oldRoles = existingUser.roles;

        const normalize = (arr) => [...new Set(arr)].sort();

        const normalizedOld = normalize(oldRoles);
        const normalizedNew = normalize(roles);

        const isSame =
            JSON.stringify(normalizedOld) ===
            JSON.stringify(normalizedNew);

        if (isSame) {
            throw new AppError(
                'Roles are unchanged',
                400,
                'NO_CHANGE'
            );
        }



        const currentlyAdmin = oldRoles.includes('ADMIN');
        const willRemainAdmin = roles.includes('ADMIN');

        if (currentlyAdmin && !willRemainAdmin) {
            const adminCount = await User.countDocuments({
                roles: 'ADMIN',
                deleted_at: null,
            });

            if (adminCount <= 1) {
                throw new AppError(
                    'System must have at least one ADMIN',
                    400,
                    'LAST_ADMIN'
                );
            }
        }


        const updated = await User.findOneAndUpdate(
            {
                _id: userId,
                deleted_at: null,
            },
            {
                $set: { roles },
                $inc: { token_version: 1 },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updated) {
            throw new AppError(
                'User not found',
                404,
                'USER_NOT_FOUND'
            );
        }


        try {
            await UserAuditLogService.createLog({
                actor_id: adminId,
                action: AUDIT_ACTIONS.UPDATE_USER_ROLES,
                user_id: userId,
                changes: {
                    roles: {
                        from: normalizedOld,
                        to: normalizedNew,
                    },
                },
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
            });
        } catch (error) {
            console.error('Audit log failed:', error);
        }

        return UserMapper.toResponseDTO(updated);
    }

    static async updateUserStatus(userId, status, actorId, metadata = {}) {


        const ALLOWED_STATUS = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

        if (!ALLOWED_STATUS.includes(status)) {
            throw new AppError(
                'Invalid status',
                400,
                'INVALID_STATUS'
            );
        }


        const existingUser = await User.findOne({
            _id: userId,
            deleted_at: null,
        });

        if (!existingUser) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        const oldStatus = existingUser.status;


        if (oldStatus === status) {
            throw new AppError(
                'Status unchanged',
                400,
                'NO_CHANGE'
            );
        }


        const updated = await User.findOneAndUpdate(
            {
                _id: userId,
                deleted_at: null,
            },
            {
                $set: { status },
            },
            {
                new: true,
                runValidators: true,
            }
        );


        try {
            await UserAuditLogService.createLog({
                actor_id: actorId,
                action: AUDIT_ACTIONS.UPDATE_USER_STATUS,
                user_id: userId,
                changes: {
                    status: {
                        from: oldStatus,
                        to: status,
                    },
                },
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
            });
        } catch (error) {
            console.error('Audit log failed:', error);
        }

        return UserMapper.toResponseDTO(updated);
    }

    static async logoutAllDevices(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { token_version: 1 } },
            { new: true }
        );

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return { message: 'Logged out from all devices' };
    }

    static async verifyTokenVersion(userId, tokenVersion) {
        const user = await User.findById(userId).select('+token_version');

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (user.token_version !== tokenVersion) {
            throw new AppError(
                'Token has been revoked',
                401,
                'TOKEN_REVOKED'
            );
        }

        return true;
    }

    static async getUserWithTokenVersion(userId) {
        const user = await User.findById(userId).select('+token_version');

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return user;
    }
}

module.exports = UserService;
