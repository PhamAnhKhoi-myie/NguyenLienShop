const UserAddress = require('./user_addresses.model');
const UserAddressMapper = require('./user_addresses.mapper');
const AppError = require('../../utils/appError.util');
const UserAddressAuditLogService = require('../audit_logs/user_address_audit_log/user_address_log.service');
const LocationProvince = require('../locations/location_province.model');
const LocationWard = require('../locations/location_ward.model');
const { AUDIT_ACTIONS } = require('../../constants/audit');

class UserAddressService {
    static async getActiveProvince(provinceCode, session) {
        const query = LocationProvince.findOne({
            code: provinceCode,
            is_active: true,
        }).select('code name');

        if (session) {
            query.session(session);
        }

        const province = await query.lean();

        if (!province) {
            throw new AppError(
                'Province not found',
                400,
                'INVALID_PROVINCE_CODE'
            );
        }

        return province;
    }

    static async getActiveWard(wardCode, provinceCode, session) {
        const query = LocationWard.findOne({
            code: wardCode,
            province_code: provinceCode,
            is_active: true,
        }).select('code name province_code province_name');

        if (session) {
            query.session(session);
        }

        const ward = await query.lean();

        if (!ward) {
            throw new AppError(
                'Ward not found for province',
                400,
                'INVALID_WARD_CODE'
            );
        }

        return ward;
    }

    static buildFullAddress(detail, wardName, provinceName) {
        return [detail, wardName, provinceName].filter(Boolean).join(', ');
    }

    static async buildLocationData(data, existing = null, session = null) {
        if (
            existing &&
            data.province_code &&
            data.province_code !== existing.province_code &&
            !data.ward_code
        ) {
            throw new AppError(
                'ward_code is required when province_code changes',
                400,
                'WARD_CODE_REQUIRED'
            );
        }

        const provinceCode = data.province_code ?? existing?.province_code;
        const wardCode = data.ward_code ?? existing?.ward_code;
        const detail = data.detail ?? existing?.detail;
        const normalizedDetail = typeof detail === 'string' ? detail.trim() : '';

        if (!provinceCode || !wardCode || !normalizedDetail) {
            throw new AppError(
                'Complete address location is required',
                400,
                'ADDRESS_LOCATION_REQUIRED'
            );
        }

        const province = await this.getActiveProvince(provinceCode, session);
        const ward = await this.getActiveWard(wardCode, provinceCode, session);

        return {
            province_code: province.code,
            province_name: province.name,
            ward_code: ward.code,
            ward_name: ward.name,
            detail: normalizedDetail,
            full_address: this.buildFullAddress(
                normalizedDetail,
                ward.name,
                province.name
            ),
        };
    }

    static getAddressPayload(data) {
        const payload = {};
        const fields = ['receiver_name', 'phone', 'is_default'];

        fields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                payload[field] = data[field];
            }
        });

        if (Object.prototype.hasOwnProperty.call(data, 'note')) {
            payload.note = data.note || null;
        }

        return payload;
    }

    static toAuditSnapshot(address) {
        return {
            receiver_name: address.receiver_name,
            phone: address.phone,
            province_code: address.province_code,
            province_name: address.province_name,
            ward_code: address.ward_code,
            ward_name: address.ward_name,
            detail: address.detail,
            full_address: address.full_address,
            note: address.note || null,
            is_default: address.is_default,
        };
    }

    static buildChanges(oldData, newData) {
        const changes = {};

        Object.keys(newData).forEach((key) => {
            if (oldData[key] !== newData[key]) {
                changes[key] = {
                    from: oldData[key],
                    to: newData[key],
                };
            }
        });

        return changes;
    }

    static async createAddress(userId, data, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
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

            const locationData = await this.buildLocationData(data, null, session);

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
                [{
                    user_id: userId,
                    ...this.getAddressPayload(data),
                    ...locationData,
                }],
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

            const created = address[0];

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
        const addresses = await UserAddress.find({ user_id: userId })
            .sort({ created_at: -1 });

        return addresses.map(UserAddressMapper.toResponseDTO);
    }

    static async setDefaultAddress(userId, addressId, metadata = {}) {
        const session = await UserAddress.startSession();
        session.startTransaction();

        try {
            const address = await UserAddress.findOne(
                { _id: addressId, user_id: userId }
            ).session(session);

            if (!address) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            const oldIsDefault = address.is_default;

            await UserAddress.updateMany(
                { user_id: userId, is_default: true },
                { is_default: false },
                { session }
            );

            await UserAddress.updateOne(
                { _id: addressId, user_id: userId },
                { is_default: true },
                { session }
            );

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

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
            const existing = await UserAddress.findOne(
                { _id: addressId, user_id: userId }
            ).session(session);

            if (!existing) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

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

            const locationFields = ['province_code', 'ward_code', 'detail'];
            const updateData = this.getAddressPayload(data);

            if (
                locationFields.some((field) =>
                    Object.prototype.hasOwnProperty.call(data, field)
                )
            ) {
                Object.assign(
                    updateData,
                    await this.buildLocationData(data, existing, session)
                );
            }

            const oldData = this.toAuditSnapshot(existing);

            const address = await UserAddress.findOneAndUpdate(
                { _id: addressId, user_id: userId },
                updateData,
                { new: true, runValidators: true, session }
            );

            const newData = this.toAuditSnapshot(address);
            const changes = this.buildChanges(oldData, newData);

            await session.commitTransaction({ writeConcern: { w: 'majority' } });

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
            const existing = await UserAddress.findOne(
                { _id: addressId, user_id: userId, deleted_at: null }
            ).session(session);

            if (!existing) {
                throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
            }

            const oldIsDefault = existing.is_default;
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
