import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import FileUploadBox from '../../../shared/components/FileUploadBox';
import { cn } from '../../../shared/utils/cn';

function getOptionValue(item) {
    return item.id || item._id;
}

function buildOptions(field, optionData, currentId, context) {
    if (typeof field.options === 'function') {
        return field.options(context) || [];
    }

    if (field.options) {
        return field.options;
    }

    if (field.optionsSource === 'categories') {
        return (optionData.categories || [])
            .filter((category) => getOptionValue(category) !== currentId)
            .map((category) => ({
                value: getOptionValue(category),
                label: category.name,
            }));
    }

    return [];
}

function resolveFieldFlag(flag, context) {
    if (typeof flag === 'function') {
        return flag(context);
    }

    return Boolean(flag);
}

function FieldRenderer({
    field,
    register,
    error,
    optionData,
    currentId,
    mode,
    initialData,
    values,
}) {
    const fieldContext = { mode, initialData, values };
    const disabled = resolveFieldFlag(field.disabled, fieldContext);
    const readOnly = resolveFieldFlag(field.readOnly, fieldContext);

    const commonProps = {
        label: field.label,
        error: error?.message,
        className: field.inputClassName,
        placeholder: field.placeholder,
        disabled,
        readOnly,
        helperText:
            typeof field.helperText === 'function'
                ? field.helperText(fieldContext)
                : field.helperText,
        ...register(field.name),
    };

    if (field.type === 'textarea') {
        return <Textarea rows={field.rows || 4} {...commonProps} />;
    }

    if (field.type === 'select') {
        return (
            <Select
                label={field.label}
                error={error?.message}
                disabled={disabled}
                helperText={commonProps.helperText}
                {...register(field.name)}
            >
                {field.emptyLabel && <option value="">{field.emptyLabel}</option>}
                {buildOptions(field, optionData, currentId, fieldContext).map(
                    (option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    )
                )}
            </Select>
        );
    }

    if (field.type === 'file') {
        return (
            <FileUploadBox
                label={field.label}
                accept={field.accept || 'image/png,image/jpeg,image/jpg,image/webp'}
                helperText={
                    typeof field.helperText === 'function'
                        ? field.helperText(fieldContext)
                        : field.helperText
                }
                error={error?.message}
                disabled={disabled}
                multiple={field.multiple}
                maxFiles={field.maxFiles}
                previewUrl={initialData ? field.previewUrl?.(initialData) : undefined}
                previewUrls={initialData ? field.previewUrls?.(initialData) || [] : []}
                className={field.inputClassName}
                onChange={(file) => {
                    const eventValue = field.multiple ? file : file ? [file] : [];

                    register(field.name).onChange({
                        target: {
                            name: field.name,
                            value: eventValue,
                        },
                    });
                }}
            />
        );
    }

    return (
        <Input
            type={field.type || 'text'}
            min={field.type === 'number' ? 0 : undefined}
            {...commonProps}
        />
    );
}

function SectionTabs({ sections, activeKey, errors, onChange }) {
    return (
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
            {sections.map((section) => {
                const isActive = section.key === activeKey;
                const errorCount = section.fields.filter((name) => errors[name]).length;

                return (
                    <button
                        key={section.key}
                        type="button"
                        onClick={() => onChange(section.key)}
                        className={cn(
                            'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-background)]'
                        )}
                    >
                        {section.label}
                        {errorCount > 0 && (
                            <span
                                className={cn(
                                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold',
                                    isActive
                                        ? 'bg-white text-[var(--color-primary)]'
                                        : 'bg-red-100 text-[var(--color-error)]'
                                )}
                            >
                                {errorCount}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default function AdminResourceForm({
    form,
    mode,
    initialData,
    optionData,
    isLoading,
    error,
    onCancel,
    onSubmit,
}) {
    const sections = useMemo(() => form.sections || [], [form.sections]);
    const [activeSectionKey, setActiveSectionKey] = useState(
        sections[0]?.key || 'all'
    );
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(form.schema),
        defaultValues: form.defaultValues,
        shouldUnregister: false,
    });

    useEffect(() => {
        reset(form.toFormValues(initialData || {}));
    }, [form, initialData, reset]);

    const currentId = initialData?.id || initialData?._id;
    const values = useWatch({ control }) || {};
    const fieldsByName = useMemo(
        () => new Map(form.fields.map((field) => [field.name, field])),
        [form.fields]
    );
    const activeSection = sections.find(
        (section) => section.key === activeSectionKey
    );
    const visibleFields = activeSection
        ? activeSection.fields
              .map((name) => fieldsByName.get(name))
              .filter(Boolean)
        : form.fields;
    const handleInvalidSubmit = (formErrors) => {
        if (!sections.length) {
            return;
        }

        const firstSectionWithError = sections.find((section) =>
            section.fields.some((name) => formErrors[name])
        );

        if (firstSectionWithError) {
            setActiveSectionKey(firstSectionWithError.key);
        }
    };
    const handleFormSubmit = handleSubmit(onSubmit, handleInvalidSubmit);

    return (
        <form className="space-y-6" onSubmit={handleFormSubmit}>
            {sections.length > 0 && (
                <SectionTabs
                    sections={sections}
                    activeKey={activeSectionKey}
                    errors={errors}
                    onChange={setActiveSectionKey}
                />
            )}

            {activeSection?.description && (
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                    {activeSection.description}
                </p>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {visibleFields.map((field) => {
                    const fieldContext = { mode, initialData, values };

                    if (resolveFieldFlag(field.hidden, fieldContext)) {
                        return null;
                    }

                    return (
                        <div key={field.name} className={cn(field.className)}>
                            <FieldRenderer
                                field={field}
                                register={register}
                                error={errors[field.name]}
                                optionData={optionData}
                                currentId={currentId}
                                mode={mode}
                                initialData={initialData}
                                values={values}
                            />
                        </div>
                    );
                })}
            </div>

            {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                    {error.message}
                </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onCancel}> {translate('text.close')} </Button>
                <Button type="submit" isLoading={isLoading}>
                    <Save className="h-4 w-4" />
                    {mode === 'edit' ? translate('text.save_changes') : translate('text.create_new')}
                </Button>
            </div>
        </form>
    );
}
