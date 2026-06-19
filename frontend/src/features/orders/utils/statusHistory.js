import { translate } from '../../../shared/i18n/index';

const LEGACY_NOTE_KEYS = {
    'Admin update': 'order.history.admin_update',
    'Delivery confirmed': 'order.history.delivery_confirmed',
    'Order created': 'order.history.order_created',
    'Payment confirmed': 'order.history.payment_confirmed',
    'Shipment tracking details updated':
        'order.history.shipment_tracking_updated',
    'Started by admin': 'order.history.started_by_admin',
    'Đã giao hàng': 'order.history.delivery_confirmed',
    'Đã thanh toán': 'order.history.payment_confirmed',
    'Thanh toán thất bại': 'order.history.payment_failed',
};

const SHIPPED_VIA_PATTERNS = [
    /^Shipped via\s+(.+)$/i,
    /^Đơn vị vận chuyển:\s*(.+)$/i,
    /^.*vận chuyển:\s*(.+)$/i,
    /^.*váº­n chuyá»ƒn:\s*(.+)$/i,
];

function translateIfAvailable(key, params, fallback = '') {
    if (!key) {
        return fallback;
    }

    const translated = translate(key, params);

    if (!translated || translated === key) {
        return fallback || key;
    }

    return translated;
}

function getRecordParams(record = {}) {
    return record.note_params || record.noteParams || {};
}

function getExplicitNoteKey(record = {}) {
    return record.note_key || record.noteKey || null;
}

function getLegacyShippedViaNote(note) {
    for (const pattern of SHIPPED_VIA_PATTERNS) {
        const match = note.match(pattern);

        if (match?.[1]) {
            return translateIfAvailable(
                'order.history.shipped_via',
                { carrier: match[1].trim() },
                note
            );
        }
    }

    return null;
}

export function getStatusHistoryNote(record = {}) {
    const note = typeof record.note === 'string' ? record.note.trim() : '';
    const noteKey = getExplicitNoteKey(record);

    if (noteKey) {
        return translateIfAvailable(noteKey, getRecordParams(record), note);
    }

    if (!note) {
        return '';
    }

    const legacyKey = LEGACY_NOTE_KEYS[note];

    if (legacyKey) {
        return translateIfAvailable(legacyKey, {}, note);
    }

    return getLegacyShippedViaNote(note) || note;
}
