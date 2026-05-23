import { forwardRef } from 'react';
import { cn } from '../utils/cn';

const Select = forwardRef(
    ({ label, error, helperText, className, id, name, children, ...props }, ref) => {
        const selectId = id || name;

        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-[var(--color-text-main)]"
                    >
                        {label}
                    </label>
                )}

                <select
                    ref={ref}
                    id={selectId}
                    name={name}
                    className={cn(
                        'h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:text-[var(--color-text-muted)]',
                        error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>

                {error && (
                    <p className="text-sm text-[var(--color-error)]">{error}</p>
                )}
                {!error && helperText && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
