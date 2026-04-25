const User = require('./user.model');
const UserMapper = require('./user.mapper');
const AppError = require('../../utils/appError.util');

class UserService {
    /**
     * Get user by ID
     * @param {String} userId - MongoDB ObjectId
     * @returns {Object} User DTO
     * @throws {AppError} If user not found
     */
    static async getUserById(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return UserMapper.toResponseDTO(user);
    }

    /**
     * Get current authenticated user
     * @param {String} userId - MongoDB ObjectId
     * @returns {Object} User DTO
     */
    static async getMe(userId) {
        return UserService.getUserById(userId);
    }

    /**
     * Get all users with pagination and filtering
     * @param {Number} page - Page number (1-indexed)
     * @param {Number} limit - Items per page
     * @param {String} search - Search query (email or name)
     * @param {String} status - Filter by status
     * @returns {Object} Paginated users with metadata
     */
    static async getAllUsers(page = 1, limit = 20, search = null, status = null) {
        const skip = (page - 1) * limit;
        const filter = {};

        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { 'profile.full_name': { $regex: search, $options: 'i' } },
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

    /**
     * Update user profile
     * @param {String} userId - MongoDB ObjectId
     * @param {Object} updateData - Data from UserMapper.toUpdatePayload()
     * @returns {Object} Updated user DTO
     * @throws {AppError} If user not found or validation fails
     */
    static async updateUser(userId, updateData) {
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(
                'No valid fields to update',
                400,
                'VALIDATION_ERROR'
            );
        }

        try {
            const updated = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!updated) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            return UserMapper.toResponseDTO(updated);
        } catch (error) {
            // Handle MongoDB duplicate key error
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new AppError(
                    `${field} already exists`,
                    409,
                    'DUPLICATE_FIELD'
                );
            }
            throw error;
        }
    }

    /**
     * Delete user (soft delete)
     * @param {String} userId - MongoDB ObjectId
     * @returns {Object} Deletion confirmation
     * @throws {AppError} If user not found
     */
    static async deleteUser(userId) {
        const user = await User.findByIdAndUpdate(
            userId,
            { deleted_at: new Date() },
            { new: true }
        );

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return UserMapper.toResponseDTO(user);
    }

    /**
     * Update user roles (admin only)
     * @param {String} userId - MongoDB ObjectId
     * @param {Array<String>} roles - Array of roles ['CUSTOMER', 'MANAGER', 'ADMIN']
     * @returns {Object} Updated user DTO
     * @throws {AppError} If user not found or invalid roles
     */
    static async updateUserRoles(userId, roles) {
        if (!Array.isArray(roles) || roles.length === 0) {
            throw new AppError(
                'Roles must be a non-empty array',
                400,
                'VALIDATION_ERROR'
            );
        }

        // Validate role enum
        const validRoles = ['CUSTOMER', 'MANAGER', 'ADMIN'];
        const invalidRoles = roles.filter((r) => !validRoles.includes(r));

        if (invalidRoles.length > 0) {
            throw new AppError(
                `Invalid roles: ${invalidRoles.join(', ')}`,
                400,
                'INVALID_ROLE'
            );
        }

        const updated = await User.findByIdAndUpdate(
            userId,
            { roles },
            { new: true }
        );

        if (!updated) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return UserMapper.toResponseDTO(updated);
    }

    /**
     * Logout all devices (increment token version)
     * Used when user changes password or wants to logout all devices
     * 
     * @param {String} userId - MongoDB ObjectId
     * @returns {Object} Logout confirmation
     * @throws {AppError} If user not found
     */
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

    /**
     * Verify token version (check if token is revoked)
     * Used in auth middleware to invalidate old tokens
     * 
     * @param {String} userId - MongoDB ObjectId
     * @param {Number} tokenVersion - Version from JWT payload
     * @returns {Boolean} True if token version is valid
     * @throws {AppError} If user not found or token is revoked
     */
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

    /**
     * Get user with token version (for auth middleware)
     * Used in auth.middleware.js for token revocation check
     * 
     * @param {String} userId - MongoDB ObjectId
     * @returns {Object} User document with token_version
     * @throws {AppError} If user not found
     */
    static async getUserWithTokenVersion(userId) {
        const user = await User.findById(userId).select('+token_version');

        if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        return user;
    }
}

module.exports = UserService;