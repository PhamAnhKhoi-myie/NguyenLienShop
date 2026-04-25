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

            if (data.is_default) {
                // Client explicitly set as default - clear others
                await UserAddress.updateMany(
                    { user_id: userId },
                    { is_default: false },
                    { session }
                );
            } else if (count === 0) {
                // First address - auto-set as default
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

            // Clear all defaults for this user
            await UserAddress.updateMany(
                { user_id: userId },
                { is_default: false },
                { session }
            );

            // Set this address as default
            await UserAddress.updateOne(
                { _id: addressId },
                { is_default: true },
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            const updatedAddress = await UserAddress.findById(addressId);
            return UserAddressMapper.toResponseDTO(updatedAddress);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async updateAddress(userId, addressId, data) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            if (data.is_default) {
                // If setting as default, clear others
                await UserAddress.updateMany(
                    { user_id: userId },
                    { is_default: false },
                    { session }
                );
            }

            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId },
                data,
                { new: true, session }
            );

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            await session.commitTransaction({ writeConcern: { w: 'majority' } });
            return UserAddressMapper.toResponseDTO(address);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async deleteAddress(userId, addressId) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            const address = await UserAddress.findOneAndDelete(
                { _id: addressId, user_id: userId },
                { session }
            );

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            // If deleted address was default, promote next oldest
            if (address.is_default) {
                const nextDefault = await UserAddress.findOne(
                    { user_id: userId }
                ).sort({ created_at: 1 }).session(session);

                if (nextDefault) {
                    await UserAddress.updateOne(
                        { _id: nextDefault._id },
                        { is_default: true },
                        { session }
                    );
                }
            }

            await session.commitTransaction({ writeConcern: { w: 'majority' } });
            return UserAddressMapper.toResponseDTO(address);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = UserAddressService;