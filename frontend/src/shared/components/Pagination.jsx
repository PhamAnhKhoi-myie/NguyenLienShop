import { translate } from '../i18n/index';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
    page = 1,
    totalPages = 1,
    onPageChange,
}) {
    const safeTotalPages = Math.max(Number(totalPages) || 1, 1);
    const safePage = Math.min(Math.max(Number(page) || 1, 1), safeTotalPages);
    const canGoPrev = safePage > 1;
    const canGoNext = safePage < safeTotalPages;

    return (
        <div className="flex items-center justify-between gap-3">
            <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => onPageChange?.(safePage - 1)}
            >
                <ChevronLeft className="h-4 w-4" /> {translate('text.previous')} </Button>

            <span className="text-sm text-[var(--color-text-muted)]"> {translate('text.trang')} {safePage} / {safeTotalPages}
            </span>

            <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => onPageChange?.(safePage + 1)}
            > {translate('text.sau')} <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
