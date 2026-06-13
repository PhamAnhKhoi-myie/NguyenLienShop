import { translate } from '../i18n/index';
import { UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../utils/cn';

export default function FileUploadBox(props) {
    const { multiple = false, previewUrl, previewUrls = [] } = props;
    const externalPreviewKey = useMemo(() => {
        const urls = multiple ? previewUrls : [previewUrl];

        return urls.filter(Boolean).join('\n');
    }, [multiple, previewUrl, previewUrls]);
    const externalPreviews = useMemo(
        () => (externalPreviewKey ? externalPreviewKey.split('\n') : []),
        [externalPreviewKey]
    );

    return (
        <FileUploadBoxContent
            key={`${multiple ? 'multiple' : 'single'}-${externalPreviewKey}`}
            {...props}
            multiple={multiple}
            externalPreviews={externalPreviews}
        />
    );
}

function FileUploadBoxContent({
    label = translate('text.photo'),
    accept = 'image/png,image/jpeg,image/jpg,image/webp',
    helperText = translate('text.png_jpg_jpeg_webp_supported'),
    error,
    disabled = false,
    multiple = false,
    onChange,
    externalPreviews = [],
    className,
}) {
    const inputRef = useRef(null);
    const objectUrlsRef = useRef([]);
    const [localPreviews, setLocalPreviews] = useState([]);

    const previews = localPreviews.length
        ? localPreviews.map((item) => item.url)
        : externalPreviews;
    const hasLocalPreviews = localPreviews.length > 0;

    const revokeObjectUrls = useCallback(() => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current = [];
    }, []);

    useEffect(
        () => () => {
            revokeObjectUrls();
        },
        [revokeObjectUrls]
    );

    const clearInputValue = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const emitChange = (files) => {
        onChange?.(multiple ? files : files[0] || null);
    };

    const handleFiles = (fileList) => {
        if (disabled) return;

        const files = Array.from(fileList || []);
        const nextFiles = multiple ? files : files.slice(0, 1);

        if (!nextFiles.length) {
            return;
        }

        revokeObjectUrls();

        const nextPreviews = nextFiles.map((file) => {
            const url = URL.createObjectURL(file);
            objectUrlsRef.current.push(url);

            return { file, url };
        });

        setLocalPreviews(nextPreviews);
        clearInputValue();
        emitChange(nextFiles);
    };

    const handleFileChange = (event) => {
        handleFiles(event.target.files);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
    };

    const handleRemoveAll = (event) => {
        event.stopPropagation();

        revokeObjectUrls();
        setLocalPreviews([]);
        clearInputValue();
        emitChange([]);
    };

    const handleRemoveOne = (event, removeIndex) => {
        event.stopPropagation();

        const removedPreview = localPreviews[removeIndex];

        if (removedPreview?.url) {
            URL.revokeObjectURL(removedPreview.url);
            objectUrlsRef.current = objectUrlsRef.current.filter(
                (url) => url !== removedPreview.url
            );
        }

        const nextPreviews = localPreviews.filter(
            (_, index) => index !== removeIndex
        );
        const nextFiles = nextPreviews.map((item) => item.file);

        setLocalPreviews(nextPreviews);
        clearInputValue();
        emitChange(nextFiles);
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
                    if (
                        !disabled &&
                        (event.key === 'Enter' || event.key === ' ')
                    ) {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                className={cn(
                    'relative min-h-[220px] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 transition',
                    'hover:border-[var(--color-primary)] hover:bg-[var(--color-secondary)]',
                    disabled && 'cursor-not-allowed opacity-60',
                    error && 'border-[var(--color-error)]'
                )}
            >
                {previews.length > 0 ? (
                    <div className="w-full space-y-4">
                        {multiple ? (
                            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {previews.map((preview, index) => (
                                    <div
                                        key={`${preview}-${index}`}
                                        className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-white"
                                    >
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="h-32 w-full object-contain p-2"
                                        />

                                        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                                            {index + 1}
                                        </span>

                                        {hasLocalPreviews && !disabled && (
                                            <button
                                                type="button"
                                                onClick={(event) =>
                                                    handleRemoveOne(event, index)
                                                }
                                                className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-[var(--color-text-main)] shadow"
                                                aria-label={translate('text.delete_photo_value', { value0: index + 1 })}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <img
                                src={previews[0]}
                                alt={translate('text.preview')}
                                className="h-full max-h-[260px] w-full object-contain"
                            />
                        )}

                        <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
                            <p className="text-sm text-[var(--color-text-muted)]">
                                {hasLocalPreviews
                                    ? translate('text.click_on_the_frame_to_select_the_image_again')
                                    : translate('text.click_on_the_frame_to_select_a_new_image')}
                            </p>

                            {hasLocalPreviews && !disabled && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAll}
                                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[var(--color-text-main)] shadow"
                                >
                                    <X className="h-4 w-4" /> {translate('text.delete_selected_photo')} </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                        <UploadCloud className="h-10 w-10 text-[var(--color-primary)]" />

                        <p className="mt-4 text-base font-medium text-[var(--color-text-main)]"> {translate('text.select_image_or_drag_and_drop_here')} </p>

                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                            {helperText}
                        </p>

                        <span className="mt-5 inline-flex rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white"> {translate('text.select_file')} </span>
                    </div>
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
