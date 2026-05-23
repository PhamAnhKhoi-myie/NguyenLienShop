import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const variants = {
    primary:
        'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-[var(--color-primary)]',
    secondary:
        'bg-[var(--color-secondary)] text-[var(--color-primary-hover)] hover:bg-green-200 focus-visible:outline-[var(--color-primary)]',
    outline:
        'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-background)] focus-visible:outline-[var(--color-primary)]',
    ghost:
        'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-primary-hover)] focus-visible:outline-[var(--color-primary)]',
    danger:
        'bg-[var(--color-error)] text-white hover:bg-red-700 focus-visible:outline-[var(--color-error)]',
    warning:
        'bg-[var(--color-warning)] text-white hover:bg-amber-600 focus-visible:outline-[var(--color-warning)]',
};

const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
};

export default function Button({
    type = 'button',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    fullWidth = false,
    className,
    children,
    ...props
}) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60',
                variants[variant],
                sizes[size],
                fullWidth && 'w-full',
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}
