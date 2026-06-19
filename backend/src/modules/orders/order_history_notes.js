const ORDER_HISTORY_KEYS = {
    ADMIN_UPDATE: 'order.history.admin_update',
    DELIVERY_CONFIRMED: 'order.history.delivery_confirmed',
    ORDER_CREATED: 'order.history.order_created',
    PAYMENT_CONFIRMED: 'order.history.payment_confirmed',
    PAYMENT_FAILED: 'order.history.payment_failed',
    SHIPMENT_CANCELLED: 'order.history.shipment_cancelled',
    SHIPMENT_TRACKING_UPDATED: 'order.history.shipment_tracking_updated',
    SHIPPED_VIA: 'order.history.shipped_via',
    STARTED_BY_ADMIN: 'order.history.started_by_admin',
};

const FALLBACKS = {
    [ORDER_HISTORY_KEYS.ADMIN_UPDATE]:
        'Admin \u0111\u00e3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i \u0111\u01a1n h\u00e0ng',
    [ORDER_HISTORY_KEYS.DELIVERY_CONFIRMED]:
        '\u0110\u00e3 x\u00e1c nh\u1eadn giao h\u00e0ng',
    [ORDER_HISTORY_KEYS.ORDER_CREATED]:
        '\u0110\u01a1n h\u00e0ng \u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o',
    [ORDER_HISTORY_KEYS.PAYMENT_CONFIRMED]:
        '\u0110\u00e3 x\u00e1c nh\u1eadn thanh to\u00e1n',
    [ORDER_HISTORY_KEYS.PAYMENT_FAILED]:
        'Thanh to\u00e1n th\u1ea5t b\u1ea1i',
    [ORDER_HISTORY_KEYS.SHIPMENT_CANCELLED]:
        '\u0110\u00e3 h\u1ee7y v\u1eadn \u0111\u01a1n',
    [ORDER_HISTORY_KEYS.SHIPMENT_TRACKING_UPDATED]:
        '\u0110\u00e3 c\u1eadp nh\u1eadt th\u00f4ng tin v\u1eadn \u0111\u01a1n',
    [ORDER_HISTORY_KEYS.STARTED_BY_ADMIN]:
        'Admin b\u1eaft \u0111\u1ea7u x\u1eed l\u00fd',
};

function getSystemNoteFallback(noteKey, params = {}) {
    if (noteKey === ORDER_HISTORY_KEYS.SHIPPED_VIA) {
        return `\u0110ang giao qua ${params.carrier || ''}`.trim();
    }

    return FALLBACKS[noteKey] || '';
}

function buildOrderHistorySystemNote(noteKey, params = {}) {
    return {
        note: getSystemNoteFallback(noteKey, params),
        note_type: 'system',
        note_key: noteKey,
        note_params: params,
    };
}

function buildOrderHistoryManualNote(note = '') {
    return {
        note,
        note_type: 'manual',
    };
}

module.exports = {
    ORDER_HISTORY_KEYS,
    buildOrderHistoryManualNote,
    buildOrderHistorySystemNote,
};
