import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({
    open,
    title,
    children,
    footer,
    onClose,
    panelClassName = '',
    bodyClassName = '',
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div
                role="dialog"
                aria-modal="true"
                className={`max-h-[90vh] w-full max-w-lg overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl ${panelClassName}`}
            >
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                    <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
                        {title}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className={`max-h-[calc(90vh-130px)] overflow-y-auto px-5 py-4 ${bodyClassName}`}>
                    {children}
                </div>

                {footer && (
                    <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
