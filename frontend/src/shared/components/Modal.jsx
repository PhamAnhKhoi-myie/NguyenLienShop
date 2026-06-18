import { translate } from '../i18n/index';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import Button from './Button';

let openModalCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

function lockPageScroll() {
    if (openModalCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        originalBodyPaddingRight = document.body.style.paddingRight;

        const scrollbarWidth =
            window.innerWidth - document.documentElement.clientWidth;
        const currentPaddingRight = Number.parseFloat(
            window.getComputedStyle(document.body).paddingRight
        );

        document.body.style.overflow = 'hidden';

        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
        }
    }

    openModalCount += 1;
}

function unlockPageScroll() {
    openModalCount = Math.max(0, openModalCount - 1);

    if (openModalCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
    }
}

export default function Modal({
    open,
    title,
    children,
    footer,
    onClose,
    panelClassName = '',
    bodyClassName = '',
}) {
    useEffect(() => {
        if (!open) return undefined;

        lockPageScroll();

        return unlockPageScroll;
    }, [open]);

    if (!open) {
        return null;
    }

    const resolvedPanelClassName = panelClassName || 'max-w-3xl';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 px-3 py-5 sm:px-6 lg:px-8">
            <div
                role="dialog"
                aria-modal="true"
                className={`flex max-h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl ${resolvedPanelClassName}`}
            >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 sm:px-7">
                    <h2 className="min-w-0 break-words text-xl font-semibold leading-7 text-[var(--color-text-main)]">
                        {title}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="shrink-0"
                        aria-label={translate('text.close')}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-7 ${bodyClassName}`}>
                    {children}
                </div>

                {footer && (
                    <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
