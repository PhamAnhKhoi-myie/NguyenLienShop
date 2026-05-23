import { forwardRef } from 'react';
import { cn } from '../utils/cn';

const Input = forwardRef(
    ({ label, error, helperText, className, id, name, ...props }, ref) => {
        const inputId = id || name;

        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-[var(--color-text-main)]"
                    >
                        {label}
                    </label>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    className={cn(
                        'h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:text-[var(--color-text-muted)]',
                        error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
                        className
                    )}
                    {...props}
                />

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

Input.displayName = 'Input';

export default Input;
