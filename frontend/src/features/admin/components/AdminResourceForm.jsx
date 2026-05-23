import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import { cn } from '../../../shared/utils/cn';

function getOptionValue(item) {
    return item.id || item._id;
}

function buildOptions(field, optionData, currentId) {
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
}) {
    const fieldContext = { mode, initialData };
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
                {buildOptions(field, optionData, currentId).map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
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
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(form.schema),
        defaultValues: form.defaultValues,
    });

    useEffect(() => {
        reset(form.toFormValues(initialData || {}));
    }, [form, initialData, reset]);

    const currentId = initialData?.id || initialData?._id;

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
                {form.fields.map((field) => (
                    <div key={field.name} className={cn(field.className)}>
                        <FieldRenderer
                            field={field}
                            register={register}
                            error={errors[field.name]}
                            optionData={optionData}
                            currentId={currentId}
                            mode={mode}
                            initialData={initialData}
                        />
                    </div>
                ))}
            </div>

            {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                    {error.message}
                </p>
            )}

            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Đóng
                </Button>
                <Button type="submit" isLoading={isLoading}>
                    <Save className="h-4 w-4" />
                    {mode === 'edit' ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
            </div>
        </form>
    );
}
