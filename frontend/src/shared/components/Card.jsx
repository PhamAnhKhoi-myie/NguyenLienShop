import { forwardRef } from 'react';
import { cn } from '../utils/cn';

const Card = forwardRef(function Card(
    { className, children, ...props },
    ref
) {
    return (
        <section
            ref={ref}
            className={cn(
                'min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </section>
    );
});

export default Card;

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
