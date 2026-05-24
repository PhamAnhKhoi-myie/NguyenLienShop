import { cn } from '../utils/cn';

export default function Card({ className, children, ...props }) {
    return (
        <section
            className={cn(
                'min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </section>
    );
}

export function CardHeader({ className, children, ...props }) {
    return (
        <div className={cn('min-w-0 border-b border-[var(--color-border)] p-5', className)} {...props}>
            {children}
        </div>
    );
}

export function CardBody({ className, children, ...props }) {
    return (
        <div className={cn('min-w-0 p-5', className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }) {
    return (
        <div
            className={cn(
                'border-t border-[var(--color-border)] p-5',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
