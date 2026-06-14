import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
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

                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        name={name}
                        className={cn(
                            'h-10 w-full appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-9 text-sm text-[var(--color-text-main)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:text-[var(--color-text-muted)]',
                            error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    <ChevronDown
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                </div>

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
