import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
    page = 1,
    totalPages = 1,
    onPageChange,
}) {
    const safeTotalPages = Math.max(totalPages, 1);
    const canGoPrev = page > 1;
    const canGoNext = page < safeTotalPages;

    return (
        <div className="flex items-center justify-between gap-3">
            <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => onPageChange?.(page - 1)}
            >
                <ChevronLeft className="h-4 w-4" />
                Trước
            </Button>

            <span className="text-sm text-[var(--color-text-muted)]">
                Trang {page} / {safeTotalPages}
            </span>

            <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => onPageChange?.(page + 1)}
            >
                Sau
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
