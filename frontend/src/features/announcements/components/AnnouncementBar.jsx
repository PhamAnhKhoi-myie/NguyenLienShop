import { translate } from '../../../shared/i18n/index';
import {
    AlertTriangle,
    Gift,
    Info,
    ShieldAlert,
    Wrench,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { useAnnouncements } from '../hooks/useAnnouncements';

const typeConfig = {
    info: {
        icon: Info,
        label: translate('text.information'),
        className: 'border-sky-200 bg-sky-50 text-sky-950',
        iconClassName: 'bg-sky-100 text-sky-700',
    },
    promotion: {
        icon: Gift,
        label: translate('text.promotion'),
        className: 'border-amber-200 bg-amber-50 text-amber-950',
        iconClassName: 'bg-amber-100 text-amber-700',
    },
    warning: {
        icon: AlertTriangle,
        label: translate('text.warning'),
        className: 'border-orange-200 bg-orange-50 text-orange-950',
        iconClassName: 'bg-orange-100 text-orange-700',
    },
    system: {
        icon: Wrench,
        label: translate('text.system'),
        className: 'border-slate-200 bg-slate-50 text-slate-900',
        iconClassName: 'bg-slate-100 text-slate-700',
    },
    urgent: {
        icon: ShieldAlert,
        label: translate('text.urgent'),
        className: 'border-red-200 bg-red-50 text-red-950',
        iconClassName: 'bg-red-100 text-red-700',
    },
};

function readDismissed(storageKey) {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const value = window.localStorage.getItem(storageKey);
        return value ? JSON.parse(value) : [];
    } catch {
        return [];
    }
}

function writeDismissed(storageKey, values) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
        return;
    }
}

function getDismissKey(announcement) {
    return [
        announcement.id || announcement._id,
        announcement.updated_at || announcement.start_at,
    ]
        .filter(Boolean)
        .join(':');
}

export default function AnnouncementBar({
    target,
    enabled = true,
    includeGlobal = true,
    maxItems = 3,
    className,
}) {
    const storageKey = `nguyenlien-dismissed-announcements:${target || 'all'}`;
    const [dismissedByKey, setDismissedByKey] = useState({});
    const announcementsQuery = useAnnouncements(target, { enabled });
    const dismissed = Object.prototype.hasOwnProperty.call(
        dismissedByKey,
        storageKey
    )
        ? dismissedByKey[storageKey]
        : readDismissed(storageKey);

    const visibleAnnouncements = useMemo(() => {
        const dismissedSet = new Set(dismissed);

        return (announcementsQuery.data || [])
            .filter((announcement) => {
                if (announcement.is_active === false) {
                    return false;
                }

                if (!includeGlobal && announcement.target !== target) {
                    return false;
                }

                return !dismissedSet.has(getDismissKey(announcement));
            })
            .slice(0, maxItems);
    }, [announcementsQuery.data, dismissed, includeGlobal, maxItems, target]);

    const handleDismiss = (announcement) => {
        const nextDismissed = [...dismissed, getDismissKey(announcement)];
        writeDismissed(storageKey, nextDismissed);
        setDismissedByKey((current) => ({
            ...current,
            [storageKey]: nextDismissed,
        }));
    };

    if (
        announcementsQuery.isError ||
        announcementsQuery.isLoading ||
        visibleAnnouncements.length === 0
    ) {
        return null;
    }

    return (
        <div className={cn('space-y-2', className)}>
            {visibleAnnouncements.map((announcement) => {
                const config = typeConfig[announcement.type] || typeConfig.info;
                const Icon = config.icon;

                return (
                    <section
                        key={getDismissKey(announcement)}
                        className={cn(
                            'flex gap-3 rounded-md border px-4 py-3 shadow-sm',
                            config.className
                        )}
                    >
                        <span
                            className={cn(
                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                config.iconClassName
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">
                                    {config.label}
                                </span>
                                <h2 className="break-words text-sm font-semibold">
                                    {announcement.title}
                                </h2>
                            </div>
                            <p className="mt-1 break-words text-sm leading-6">
                                {announcement.content}
                            </p>
                        </div>

                        {announcement.is_dismissible && (
                            <button
                                type="button"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 transition-colors hover:bg-white"
                                aria-label={translate('text.turn_off_notification')}
                                onClick={() => handleDismiss(announcement)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
