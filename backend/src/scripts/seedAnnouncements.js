const mongoose = require("mongoose");

const Announcement = require("../modules/announcements/announcement.model");
const User = require("../modules/users/user.model");
const seedUser = require("./seedUser");

const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const addHours = (date, hours) => {
    const nextDate = new Date(date);
    nextDate.setHours(nextDate.getHours() + hours);
    return nextDate;
};

const createAnnouncementData = (actorId) => {
    const now = new Date();

    return [
        {
            title: "Ưu đãi túi bao trái cây trong tuần",
            content: "Khách mua từ 5 thùng túi bao trái cây sẽ được hỗ trợ phí giao hàng nội thành.",
            priority: 9,
            target: "all",
            type: "promotion",
            is_dismissible: true,
            start_at: addDays(now, -2),
            end_at: addDays(now, 14),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
        {
            title: "Lịch giao hàng cuối tuần",
            content: "Đơn đặt sau 16:00 thứ Bảy sẽ được xử lý vào ngày làm việc tiếp theo.",
            priority: 7,
            target: "guest",
            type: "info",
            is_dismissible: true,
            start_at: addDays(now, -1),
            end_at: addDays(now, 10),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
        {
            title: "Cập nhật địa chỉ nhận hàng",
            content: "Vui lòng kiểm tra số điện thoại và địa chỉ giao hàng trước khi thanh toán đơn mới.",
            priority: 6,
            target: "user",
            type: "warning",
            is_dismissible: true,
            start_at: addDays(now, -1),
            end_at: addDays(now, 21),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
        {
            title: "Kiểm tra đơn hàng cần xử lý",
            content: "Admin và Manager kiểm tra nhóm đơn mới trước 10:00 để kịp lịch bàn giao vận chuyển.",
            priority: 10,
            target: "admin",
            type: "urgent",
            is_dismissible: false,
            start_at: addHours(now, -6),
            end_at: addDays(now, 7),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
        {
            title: "Bảo trì hệ thống quản trị",
            content: "Màn quản trị có lịch bảo trì ngắn vào tối mai, vui lòng hoàn tất cập nhật nội dung trước 20:00.",
            priority: 8,
            target: "admin",
            type: "system",
            is_dismissible: true,
            start_at: addDays(now, 1),
            end_at: addDays(now, 3),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
        {
            title: "Thông báo khuyến mãi đã kết thúc",
            content: "Chương trình giảm giá thử nghiệm đã kết thúc và chỉ dùng để kiểm tra bộ lọc expired.",
            priority: 3,
            target: "all",
            type: "info",
            is_dismissible: true,
            start_at: addDays(now, -14),
            end_at: addDays(now, -1),
            created_by: actorId,
            updated_by: actorId,
            is_deleted: false,
            deleted_at: null,
        },
    ];
};

const resolveSeedActor = async () => {
    let actor = await User.findOne({
        roles: { $in: ["ADMIN", "MANAGER"] },
        status: "ACTIVE",
    }).sort({ created_at: 1 });

    if (!actor) {
        await seedUser();

        actor = await User.findOne({
            roles: { $in: ["ADMIN", "MANAGER"] },
            status: "ACTIVE",
        }).sort({ created_at: 1 });
    }

    if (!actor) {
        throw new Error("Cannot seed announcements without ADMIN or MANAGER user");
    }

    return actor._id;
};

const seedAnnouncements = async () => {
    console.log("== Seeding announcements ==");

    const actorId = await resolveSeedActor();
    const announcements = createAnnouncementData(actorId);

    for (const announcement of announcements) {
        const existing = await Announcement.findOne({
            title: announcement.title,
            target: announcement.target,
        }).setOptions({ includeDeleted: true });

        const action = existing ? "Updated" : "Created";
        const doc = existing || new Announcement();

        Object.assign(doc, announcement);
        await doc.save();

        console.log(`[announcements] ${action}: ${announcement.title}`);
    }

    console.log("Announcements seeding completed");
};

if (require.main === module) {
    require("dotenv").config();

    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
        throw new Error("Missing MONGO_URI in .env");
    }

    const run = async () => {
        try {
            await mongoose.connect(MONGODB_URI, {
                dbName: process.env.MONGODB_DB_NAME || "nguyenlien_db",
            });

            console.log("MongoDB connected");
            console.log("DB NAME:", mongoose.connection.name);

            await seedAnnouncements();
        } catch (err) {
            console.error("Announcement seeding error:", err);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
            console.log("MongoDB disconnected");
        }
    };

    run();
}

module.exports = seedAnnouncements;
