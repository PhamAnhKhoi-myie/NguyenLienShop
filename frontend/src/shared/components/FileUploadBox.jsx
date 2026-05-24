import { UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { cn } from '../utils/cn';

export default function FileUploadBox({
    label = 'Ảnh',
    accept = 'image/png,image/jpeg,image/jpg,image/webp',
    helperText = 'PNG, JPG, JPEG, WEBP được hỗ trợ',
    error,
    disabled = false,
    multiple = false,
    onChange,
    previewUrl,
    className,
}) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(previewUrl || '');

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);
        const firstFile = files[0];

        if (firstFile) {
            setPreview(URL.createObjectURL(firstFile));
        }

        onChange?.(multiple ? files : firstFile || null);
    };

    const handleDrop = (event) => {
        event.preventDefault();

        if (disabled) return;

        const files = Array.from(event.dataTransfer.files || []);
        const firstFile = files[0];

        if (firstFile) {
            setPreview(URL.createObjectURL(firstFile));
        }

        onChange?.(multiple ? files : firstFile || null);
    };

    const handleRemove = (event) => {
        event.stopPropagation();

        setPreview('');

        if (inputRef.current) {
            inputRef.current.value = '';
        }

        onChange?.(multiple ? [] : null);
    };

    return (
        <div className={className}>
            {label && (
                <label className="mb-2 block text-sm font-medium text-[var(--color-text-main)]">
                    {label}
                </label>
            )}

            <div
                role="button"
                tabIndex={0}
                onClick={() => !disabled && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        inputRef.current?.click();
                    }
                }}
                className={cn(
                    'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 text-center transition',
                    'hover:border-[var(--color-primary)] hover:bg-[var(--color-secondary)]',
                    disabled && 'cursor-not-allowed opacity-60',
                    error && 'border-[var(--color-error)]'
                )}
            >
                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Preview"
                            className="h-full max-h-[260px] w-full object-contain"
                        />

                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="absolute right-3 top-3 rounded-full bg-white p-2 text-[var(--color-text-main)] shadow"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <UploadCloud className="h-10 w-10 text-[var(--color-primary)]" />

                        <p className="mt-4 text-base font-medium text-[var(--color-text-main)]">
                            Chọn ảnh hoặc kéo thả vào đây
                        </p>

                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                            {helperText}
                        </p>

                        <span className="mt-5 inline-flex rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white">
                            Chọn tệp
                        </span>
                    </>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {error && (
                <p className="mt-2 text-sm text-[var(--color-error)]">
                    {error}
                </p>
            )}
        </div>
    );
}