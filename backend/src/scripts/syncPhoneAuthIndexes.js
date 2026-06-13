require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const {
    normalizePhoneNumber,
    isValidVietnamPhoneNumber,
} = require('../utils/phone.util');

const syncPhoneAuthIndexes = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.collection
        .find({
            $or: [
                { deleted_at: null },
                { deleted_at: { $exists: false } },
            ],
        })
        .project({
            email: 1,
            'profile.phone_number': 1,
        })
        .toArray();

    const invalidUsers = [];
    const phoneOwners = new Map();

    for (const user of users) {
        const phoneNumber = normalizePhoneNumber(user.profile?.phone_number);

        if (!isValidVietnamPhoneNumber(phoneNumber)) {
            invalidUsers.push({
                id: user._id.toString(),
                email: user.email || null,
                phone_number: user.profile?.phone_number || null,
            });
            continue;
        }

        const owners = phoneOwners.get(phoneNumber) || [];
        owners.push(user._id.toString());
        phoneOwners.set(phoneNumber, owners);
    }

    const duplicatePhones = [...phoneOwners.entries()]
        .filter(([, owners]) => owners.length > 1)
        .map(([phoneNumber, owners]) => ({
            phone_number: phoneNumber,
            user_ids: owners,
        }));

    if (invalidUsers.length || duplicatePhones.length) {
        console.error(
            JSON.stringify(
                {
                    invalid_users: invalidUsers,
                    duplicate_phones: duplicatePhones,
                },
                null,
                2
            )
        );
        throw new Error('Phone authentication data audit failed');
    }

    if (users.length) {
        await User.collection.bulkWrite(
            users.map((user) => ({
                updateOne: {
                    filter: { _id: user._id },
                    update: {
                        $set: {
                            'profile.phone_number': normalizePhoneNumber(
                                user.profile.phone_number
                            ),
                        },
                    },
                },
            }))
        );
    }

    const result = await User.syncIndexes();
    console.log(
        JSON.stringify(
            {
                audited_users: users.length,
                dropped_indexes: result,
            },
            null,
            2
        )
    );
};

syncPhoneAuthIndexes()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
