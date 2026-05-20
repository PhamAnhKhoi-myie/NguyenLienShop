const mongoose = require('mongoose');
const ShopContentAuditLog = require('./content_log.model');
const { AUDIT_ACTIONS } = require('../../../constants/audit');

const ACTION_LEVEL_MAP = {
    [AUDIT_ACTIONS.CREATE_BANNER]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_BANNER]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_BANNER_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.RESTORE_BANNER]: 'SECURITY',
    [AUDIT_ACTIONS.CREATE_ANNOUNCEMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_ANNOUNCEMENT]: 'IMPORTANT',
    [AUDIT_ACTIONS.DELETE_ANNOUNCEMENT_SOFT]: 'SECURITY',
    [AUDIT_ACTIONS.RESTORE_ANNOUNCEMENT]: 'SECURITY',
    [AUDIT_ACTIONS.CREATE_SHOP_INFO]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_SHOP_INFO]: 'IMPORTANT',
    [AUDIT_ACTIONS.UPDATE_SHOP_INFO_STATUS]: 'SECURITY',
};

class ShopContentAuditLogService {
    static async createLog(data, options = {}) {
        try {
            const level = ACTION_LEVEL_MAP[data.action] || 'INFO';
            const payload = {
                ...data,
                changes: this.toAuditValue(data.changes),
                level,
            };

            if (options.session) {
                await ShopContentAuditLog.create([payload], { session: options.session });
                return;
            }

            await ShopContentAuditLog.create(payload);
        } catch (err) {
            console.error('[ShopContentAuditLog]', err);

            if (options.throwOnError) {
                throw err;
            }
        }
    }

    static buildCreatedChanges(doc, fields = []) {
        const normalized = doc?.toObject ? doc.toObject() : doc;

        return fields.reduce((changes, field) => {
            changes[field] = {
                from: null,
                to: this.toAuditValue(normalized?.[field]),
            };

            return changes;
        }, {});
    }

    static buildUpdatedChanges(beforeDoc, afterDoc, fields = []) {
        const before = beforeDoc?.toObject ? beforeDoc.toObject() : beforeDoc;
        const after = afterDoc?.toObject ? afterDoc.toObject() : afterDoc;

        return [...new Set(fields)].reduce((changes, field) => {
            const from = this.toAuditValue(before?.[field]);
            const to = this.toAuditValue(after?.[field]);

            if (!this.auditValuesEqual(from, to)) {
                changes[field] = { from, to };
            }

            return changes;
        }, {});
    }

    static toAuditValue(value) {
        if (value === undefined || value === null) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value instanceof mongoose.Types.ObjectId) {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.toAuditValue(item));
        }
        if (value?.toObject) {
            return this.toAuditValue(value.toObject());
        }
        if (typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                    key,
                    this.toAuditValue(item),
                ])
            );
        }

        return value;
    }

    static auditValuesEqual(left, right) {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}

module.exports = ShopContentAuditLogService;
