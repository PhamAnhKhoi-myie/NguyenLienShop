const UserAddress = require('./user_addresses.model');
const UserAddressMapper = require('./user_addresses.mapper');
const AppError = require('../../utils/appError.util');
const UserAddressAuditLogService = require('../audit_logs/user_address_audit_log/user_address_log.service');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class UserAddressService {
    static async createAddress(userId, data, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            // Count within transaction to prevent race condition
            const count = await UserAddress.countDocuments(
                { user_id: userId }
            ).session(session);

            if (count >= 10) {
                throw new AppError(
                    'Maximum 10 addresses allowed',
                    400,
                    'ADDRESS_LIMIT'
                );
            }

            if (data.is_default) {
                await UserAddress.updateMany(
                    { user_id: userId, is_default: true },
                    { is_default: false },
                    { session }
                );
            } else if (count === 0) {
                data.is_default = true;
            }

            const address = await UserAddress.create(
                [{ user_id: userId, ...data }],
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            const created = address[0];

            // ===== AUDIT LOG =====
            try {
                await UserAddressAuditLogService.createLog({
                    actor_id: userId,
                    action: AUDIT_ACTIONS.CREATE_USER_ADDRESS,
                    address_id: created._id,
                    changes: {
                        address: {
                            from: null,
                            to: created.toObject(),
                        },
                    },
                    ip_address: metadata.ip || null,
                    user_agent: metadata.userAgent || null,
                });
            } catch (err) {
                console.error('Audit log failed:', err);
            }

            return UserAddressMapper.toResponseDTO(created);

        } catch (error) {
            await session.abortTransaction();

            if (error.code === 11000) {
                throw new AppError(
                    'Default address conflict, please retry',
                    409,
                    'DEFAULT_ADDRESS_CONFLICT'
                );
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getAddressesByUserId(userId) {
        const addresses = await UserAddress.find({ user_id: userId }).sort({ created_at: -1 });
        return addresses.map(UserAddressMapper.toResponseDTO);
    }

    static async setDefaultAddress(userId, addressId, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            // ===== LẤY DỮ LIỆU CŨ =====
            const address = await UserAddress.findOne(
                { _id: addressId, user_id: userId }
            ).session(session);

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            const oldIsDefault = address.is_default;

            // ===== CLEAR DEFAULT CŨ =====
            await UserAddress.updateMany(
                { user_id: userId, is_default: true },
                { is_default: false },
                { session }
            );

            // ===== SET DEFAULT MỚI =====
            await UserAddress.updateOne(
                { _id: addressId, user_id: userId },
                { is_default: true },
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            // ===== AUDIT LOG =====
            if (oldIsDefault !== true) {
                try {
                    await UserAddressAuditLogService.createLog({
                        actor_id: userId,
                        action: AUDIT_ACTIONS.SET_DEFAULT_USER_ADDRESS,
                        address_id: addressId,
                        changes: {
                            is_default: {
                                from: oldIsDefault,
                                to: true,
                            },
                        },
                        ip_address: metadata.ip || null,
                        user_agent: metadata.userAgent || null,
                    });
                } catch (err) {
                    console.error('Audit log failed:', err);
                }
            }

            const updatedAddress = await UserAddress.findById(addressId);
            return UserAddressMapper.toResponseDTO(updatedAddress);

        } catch (error) {
            await session.abortTransaction();

            if (error.code === 11000) {
                throw new AppError(
                    'Default address conflict, please retry',
                    409,
                    'DEFAULT_ADDRESS_CONFLICT'
                );
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    static async updateAddress(userId, addressId, data, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            // ===== LẤY DỮ LIỆU CŨ =====
            const existing = await UserAddress.findOne(
                { _id: addressId, user_id: userId }
            ).session(session);

            if (!existing) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            // ===== VALIDATION LOGIC CŨ =====
            if (data.is_default === false && existing.is_default) {
                throw new AppError(
                    'Cannot unset default address directly',
                    400,
                    'INVALID_OPERATION'
                );
            }

            if (data.is_default === true) {
                await UserAddress.updateMany(
                    { user_id: userId, is_default: true },
                    { is_default: false },
                    { session }
                );
            }

            // ===== BUILD oldData / newData =====
            const oldData = {
                receiver_name: existing.receiver_name,
                phone: existing.phone,
                address_line: existing.address_line,
                city: existing.city,
                is_default: existing.is_default,
            };

            const newData = {
                receiver_name: data.receiver_name ?? oldData.receiver_name,
                phone: data.phone ?? oldData.phone,
                address_line: data.address_line ?? oldData.address_line,
                city: data.city ?? oldData.city,
                is_default: data.is_default ?? oldData.is_default,
            };

            // ===== BUILD changes (giống USER) =====
            const changes = {};

            for (const key in newData) {
                if (oldData[key] !== newData[key]) {
                    changes[key] = {
                        from: oldData[key],
                        to: newData[key],
                    };
                }
            }

            // ===== UPDATE =====
            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId },
                data,
                { new: true, runValidators: true, session }
            );

            // ===== COMMIT =====
            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            // ===== AUDIT LOG =====
            if (Object.keys(changes).length > 0) {
                try {
                    await UserAddressAuditLogService.createLog({
                        actor_id: userId,
                        action: AUDIT_ACTIONS.UPDATE_USER_ADDRESS,
                        address_id: addressId,
                        changes,
                        ip_address: metadata.ip || null,
                        user_agent: metadata.userAgent || null,
                    });
                } catch (err) {
                    console.error('Audit log failed:', err);
                }
            }

            return UserAddressMapper.toResponseDTO(address);

        } catch (error) {
            await session.abortTransaction();

            if (error.code === 11000) {
                throw new AppError(
                    'Default address conflict, please retry',
                    409,
                    'DEFAULT_ADDRESS_CONFLICT'
                );
            }

            throw error;
        } finally {
            session.endSession();
        }
    }

    static async deleteAddress(userId, addressId, actorId, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            // ===== LẤY DỮ LIỆU CŨ =====
            const existing = await UserAddress.findOne(
                { _id: addressId, user_id: userId, deleted_at: null }
            ).session(session);

            if (!existing) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            const oldIsDefault = existing.is_default;

            // ===== DELETE =====
            const deletedAt = new Date();

            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId, deleted_at: null },
                {
                    deleted_at: deletedAt,
                    deleted_by: actorId,
                    is_default: false
                },
                { new: true, session }
            );

            // ===== FIX BUG: CHECK TRƯỚC UPDATE =====
            if (oldIsDefault) {
                const nextDefault = await UserAddress.findOne(
                    { user_id: userId, deleted_at: null }
                )
                    .sort({ updated_at: -1, created_at: -1 })
                    .session(session);

                if (nextDefault) {
                    await UserAddress.updateOne(
                        { _id: nextDefault._id },
                        { is_default: true },
                        { session }
                    );
                }
            }

            await session.commitTransaction();

            // ===== AUDIT LOG =====
            try {
                await UserAddressAuditLogService.createLog({
                    actor_id: actorId,
                    action: AUDIT_ACTIONS.DELETE_USER_ADDRESS,
                    address_id: addressId,
                    changes: {
                        deleted_at: {
                            from: null,
                            to: deletedAt,
                        },
                    },
                    ip_address: metadata.ip || null,
                    user_agent: metadata.userAgent || null,
                });
            } catch (err) {
                console.error('Audit log failed:', err);
            }

            return UserAddressMapper.toResponseDTO(address);

        } catch (error) {
            await session.abortTransaction();

            if (error.code === 11000) {
                throw new AppError(
                    'Default address conflict, please retry',
                    409,
                    'DEFAULT_ADDRESS_CONFLICT'
                );
            }

            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = UserAddressService;