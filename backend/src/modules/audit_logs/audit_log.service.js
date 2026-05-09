const AuditLog = require('./audit_log.model');
const AppError = require('../../utils/appError.util');

class AuditLogService {
    /**
     * Tạo log mới (Các Service khác như UserService, CategoryService sẽ gọi hàm này)
     * Hàm này không nên throw error làm gián đoạn luồng chính của app
     */
    static async createLog(logData) {
        try {
            const log = new AuditLog(logData);
            await log.save();
            return log;
        } catch (error) {
            // Chỉ log ra console, KHÔNG throw error để tránh làm hỏng API chính (như update user)
            console.error('Lỗi khi ghi Audit Log:', error);
        }
    }

    /**
     * Lấy danh sách logs (Dành cho màn hình Admin) có phân trang và lọc
     */
    static async getAllLogs({ page = 1, limit = 20, entity_type, action, actor_id }) {
        const query = {};

        // Xây dựng bộ lọc
        if (entity_type) query.entity_type = entity_type;
        if (action) query.action = action;
        if (actor_id) query.actor_id = actor_id;

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('actor_id', 'name email roles') // Lấy thêm thông tin người thực hiện
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        return {
            data: logs,
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Lấy chi tiết 1 log (Để xem rõ old_values và new_values)
     */
    static async getLogById(logId) {
        const log = await AuditLog.findById(logId).populate('actor_id', 'name email roles').lean();
        if (!log) {
            throw new AppError('Không tìm thấy bản ghi log này', 404, 'AUDIT_LOG_NOT_FOUND');
        }
        return log;
    }
}

module.exports = AuditLogService;