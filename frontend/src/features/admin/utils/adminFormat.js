import { createElement } from 'react';
import Badge from '../../../shared/components/Badge';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export function getValue(row, path) {
    if (!path) {
        return null;
    }

    return path.split('.').reduce((value, key) => value?.[key], row);
}

export function getRows(response) {
    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response)) {
        return response;
    }

    return [];
}

export function getPagination(response) {
    return response?.pagination || response?.data?.pagination || null;
}

export function formatDateTime(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleString('vi-VN');
}

export function formatMoney(value) {
    if (value === undefined || value === null) {
        return '';
    }

    return formatCurrency(Number(value) || 0);
}

export function getStatusVariant(status) {
    if (
        [
            'ACTIVE',
            'PAID',
            'DELIVERED',
            'verified',
            'paid',
            'success',
            'delivered',
            'active',
            true,
        ].includes(status)
    ) {
        return 'success';
    }

    if (
        [
            'INACTIVE',
            'FAILED',
            'CANCELED',
            'SUSPENDED',
            'failed',
            'cancelled',
            'returned',
            'inactive',
            'expired',
            'deleted',
            false,
        ].includes(status)
    ) {
        return 'error';
    }

    if (
        [
            'PENDING',
            'PROCESSING',
            'SHIPPED',
            'pending',
            'picked_up',
            'in_transit',
            'at_destination',
            'paused',
            'medium',
            'high',
        ].includes(status)
    ) {
        return 'warning';
    }

    return 'muted';
}

export function StatusBadge({ value, label }) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    return createElement(
        Badge,
        { variant: getStatusVariant(value) },
        label || String(value)
    );
}

export function renderAdminCell(row, column) {
    const rawValue =
        typeof column.value === 'function'
            ? column.value(row)
            : getValue(row, column.value || column.key);

    if (column.type === 'status') {
        return createElement(StatusBadge, {
            value: rawValue,
            label: column.labelMap?.[rawValue],
        });
    }

    if (column.type === 'money') {
        return formatMoney(rawValue);
    }

    if (column.type === 'date') {
        return formatDateTime(rawValue);
    }

    if (column.render) {
        return column.render(rawValue, row);
    }

    if (Array.isArray(rawValue)) {
        return rawValue.join(', ');
    }

    if (typeof rawValue === 'boolean') {
        return createElement(StatusBadge, {
            value: rawValue,
            label: rawValue ? 'Có' : 'Không',
        });
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return createElement(
            'span',
            { className: 'text-[var(--color-text-muted)]' },
            '-'
        );
    }

    return String(rawValue);
}
