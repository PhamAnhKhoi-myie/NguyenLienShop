import { cn } from '../utils/cn';

const variants = {
    primary:
        'bg-[var(--color-secondary)] text-[var(--color-primary-hover)]',
    accent: 'bg-amber-100 text-amber-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    muted: 'bg-gray-100 text-[var(--color-text-muted)]',
};

export default function Badge({ variant = 'primary', className, children }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
