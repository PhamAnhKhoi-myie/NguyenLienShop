import { translate } from '../i18n/index';
import { PackageSearch } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
    icon: Icon = PackageSearch,
    title = translate('text.no_data'),
    description,
    actionLabel,
    onAction,
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--color-text-main)]">
                {title}
            </h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">
                    {description}
                </p>
            )}
            {actionLabel && (
                <Button className="mt-5" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
