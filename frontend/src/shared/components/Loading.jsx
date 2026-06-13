import { translate } from '../i18n/index';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Loading({ label = translate('text.loading'), fullPage = false }) {
    return (
        <div
            className={cn(
                'flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]',
                fullPage && 'min-h-screen bg-[var(--color-background)]'
            )}
        >
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            <span>{label}</span>
        </div>
    );
}
