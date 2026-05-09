const UserAddress = require('./user_addresses.model');
const UserAddressMapper = require('./user_addresses.mapper');
const AppError = require('../../utils/appError.util');

class UserAddressService {
    static async createAddress(userId, data) {
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
            return UserAddressMapper.toResponseDTO(address[0]);
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

    static async setDefaultAddress(userId, addressId) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            const address = await UserAddress.findOne(
                { _id: addressId, user_id: userId }
            ).session(session);

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            // 1. Chỉ clear những record đang là default
            await UserAddress.updateMany(
                { user_id: userId, is_default: true },
                { is_default: false },
                { session }
            );

            // 2. Set default cho address target
            await UserAddress.updateOne(
                { _id: addressId, user_id: userId },
                { is_default: true },
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            const updatedAddress = await UserAddress.findById(addressId);
            return UserAddressMapper.toResponseDTO(updatedAddress);

        } catch (error) {
            await session.abortTransaction();

            // 3. Handle duplicate key (race condition)
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

    static async updateAddress(userId, addressId, data) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            if (data.is_default === false) {
                const current = await UserAddress.findOne(
                    { _id: addressId, user_id: userId }
                ).session(session);

                if (current?.is_default) {
                    throw new AppError(
                        'Cannot unset default address directly',
                        400,
                        'INVALID_OPERATION'
                    );
                }
            }

            if (data.is_default === true) {
                await UserAddress.updateMany(
                    { user_id: userId, is_default: true },
                    { is_default: false },
                    { session }
                );
            }

            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId },
                data,
                { new: true, runValidators: true, session }
            );

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            await session.commitTransaction({ writeConcern: { w: 'majority' } });
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

    static async deleteAddress(userId, addressId, actorId) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId, deleted_at: null },
                {
                    deleted_at: new Date(),
                    deleted_by: actorId,
                    is_default: false
                },
                { new: true, session }
            );

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            // Nếu address bị xóa là default → promote cái khác
            if (address.is_default) {
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