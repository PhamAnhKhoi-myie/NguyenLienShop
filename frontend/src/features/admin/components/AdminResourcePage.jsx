import { translate } from '../../../shared/i18n/index';
import { Filter, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Pagination from '../../../shared/components/Pagination';
import Select from '../../../shared/components/Select';
import AdminResourceForm from './AdminResourceForm';
import {
    useAdminDetail,
    useAdminList,
    useAdminMutation,
} from '../hooks/useAdminResource';
import { ANNOUNCEMENT_QUERY_KEY } from '../../announcements/hooks/useAnnouncements';
import {
    getPagination,
    getRows,
    renderAdminCell,
} from '../utils/adminFormat';

function buildInitialFilters(filters = []) {
    return filters.reduce((values, filter) => {
        values[filter.name] = filter.defaultValue || '';
        return values;
    }, {});
}

function buildQueryParams({ page, filters, resource }) {
    const params = {
        page,
        limit: resource.limit || 20,
        ...(resource.defaultParams || {}),
    };

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            params[key] = value;
        }
    });

    return params;
}

function ResourceFilters({ filters, values, onChange, onApply, onReset }) {
    if (!filters?.length) {
        return null;
    }

    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 md:grid-cols-4">
            {filters.map((filter) => {
                if (filter.type === 'select') {
                    return (
                        <Select
                            key={filter.name}
                            label={filter.label}
                            value={values[filter.name] || ''}
                            onChange={(event) =>
                                onChange(filter.name, event.target.value)
                            }
                        >
                            {(filter.options || []).map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    );
                }

                return (
                    <Input
                        key={filter.name}
                        label={filter.label}
                        type={filter.type || 'text'}
                        placeholder={filter.placeholder}
                        value={values[filter.name] || ''}
                        onChange={(event) =>
                            onChange(filter.name, event.target.value)
                        }
                    />
                );
            })}

            <div className="flex items-end gap-2">
                <Button type="button" onClick={onApply}>
                    <Filter className="h-4 w-4" /> {translate('text.filter')} </Button>
                <Button type="button" variant="outline" onClick={onReset}> {translate('text.clear_filter')} </Button>
            </div>
        </div>
    );
}

export default function AdminResourcePage({ resource }) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [formState, setFormState] = useState({
        open: false,
        mode: 'create',
        row: null,
    });
    const [draftFilters, setDraftFilters] = useState(() =>
        buildInitialFilters(resource.filters)
    );
    const [appliedFilters, setAppliedFilters] = useState(() =>
        buildInitialFilters(resource.filters)
    );
    const queryParams = useMemo(
        () => buildQueryParams({ page, filters: appliedFilters, resource }),
        [appliedFilters, page, resource]
    );
    const listQuery = useAdminList(resource.endpoint, queryParams);
    const detailEndpoint =
        resource.form && formState.open && formState.mode === 'edit'
            ? resource.form.getDetailEndpoint(formState.row)
            : null;
    const detailQuery = useAdminDetail(detailEndpoint, {
        enabled: Boolean(detailEndpoint),
    });
    const categoryOptionsQuery = useAdminList(
        '/categories/all',
        {},
        {
            enabled: Boolean(resource.form?.needsCategoryOptions && formState.open),
        }
    );
    const createMutation = useAdminMutation({ method: 'post' });
    const patchUpdateMutation = useAdminMutation({ method: 'patch' });
    const putUpdateMutation = useAdminMutation({ method: 'put' });
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const updateMutation =
        resource.form?.updateMethod === 'put'
            ? putUpdateMutation
            : patchUpdateMutation;
    const rows = resource.normalizeRows
        ? resource.normalizeRows(listQuery.data)
        : getRows(listQuery.data);
    const pagination = getPagination(listQuery.data);
    const totalPages = pagination?.total_pages || pagination?.totalPages || 1;

    const handleFilterChange = (name, value) => {
        setDraftFilters((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleApplyFilters = () => {
        setAppliedFilters(draftFilters);
        setPage(1);
    };

    const handleResetFilters = () => {
        const nextFilters = buildInitialFilters(resource.filters);
        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const handleDelete = async (row) => {
        if (!resource.getDeleteEndpoint) {
            return;
        }

        const confirmed = window.confirm(resource.deleteConfirm || translate('text.delete_this_item'));

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: resource.getDeleteEndpoint(row),
        });

        if (resource.endpoint === '/banners') {
            await queryClient.invalidateQueries({
                queryKey: ['banners'],
            });
        }

        if (resource.endpoint === '/announcements/admin/all') {
            await queryClient.invalidateQueries({
                queryKey: ANNOUNCEMENT_QUERY_KEY,
            });
        }
    };

    const openCreateForm = () => {
        createMutation.reset();
        patchUpdateMutation.reset();
        putUpdateMutation.reset();
        setFormState({
            open: true,
            mode: 'create',
            row: null,
        });
    };

    const openEditForm = (row) => {
        createMutation.reset();
        patchUpdateMutation.reset();
        putUpdateMutation.reset();
        setFormState({
            open: true,
            mode: 'edit',
            row,
        });
    };

    const closeForm = () => {
        setFormState({
            open: false,
            mode: 'create',
            row: null,
        });
    };

    const handleSave = async (values) => {
        const form = resource.form;
        const initialData = detailQuery.data?.data || formState.row || {};
        const payload = await form.toPayload(values, {
            mode: formState.mode,
            initialData,
        });

        if (formState.mode === 'edit') {
            await updateMutation.mutateAsync({
                endpoint: form.getUpdateEndpoint(initialData),
                payload,
            });
        } else {
            await createMutation.mutateAsync({
                endpoint: form.createEndpoint,
                payload,
            });
        }

        if (resource.endpoint === '/banners') {
            await queryClient.invalidateQueries({
                queryKey: ['banners'],
            });
        }

        if (resource.endpoint === '/announcements/admin/all') {
            await queryClient.invalidateQueries({
                queryKey: ANNOUNCEMENT_QUERY_KEY,
            });
        }

        closeForm();
    };

    const formInitialData =
        formState.mode === 'edit'
            ? detailQuery.data?.data || formState.row
            : null;
    const formMutation =
        formState.mode === 'edit' ? updateMutation : createMutation;
    const categoryOptions = getRows(categoryOptionsQuery.data);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                                {resource.title}
                            </h1>
                            {resource.description && (
                                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                    {resource.description}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {resource.form && (
                                <Button onClick={openCreateForm}>
                                    <Plus className="h-4 w-4" /> {translate('text.add_new')} </Button>
                            )}
                            <Button
                                variant="outline"
                                isLoading={listQuery.isFetching}
                                onClick={() => listQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="space-y-5">
                    <ResourceFilters
                        filters={resource.filters}
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />

                    {listQuery.isLoading ? (
                        <Loading label={translate('text.loading_value', { value0: resource.title.toLowerCase() })} />
                    ) : listQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title={translate('text.unable_to_load_data')}
                            description={listQuery.error.message}
                        />
                    ) : rows.length === 0 ? (
                        <EmptyState
                            title={resource.emptyTitle || translate('text.no_data_yet')}
                            description={resource.emptyDescription}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                <thead>
                                    <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                        {resource.columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className="whitespace-nowrap px-4 py-3"
                                            >
                                                {column.header}
                                            </th>
                                        ))}
                                        {(resource.form ||
                                            resource.rowActions ||
                                            resource.getDeleteEndpoint) && (
                                                <th className="whitespace-nowrap px-4 py-3 text-right"> {translate('text.task')} </th>
                                            )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                    {rows.map((row, index) => {
                                        const rowKey =
                                            resource.getRowId?.(row) ||
                                            row.id ||
                                            row._id ||
                                            index;

                                        return (
                                            <tr key={rowKey}>
                                                {resource.columns.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className="max-w-xs whitespace-nowrap px-4 py-3 align-top text-[var(--color-text-main)]"
                                                    >
                                                        {renderAdminCell(
                                                            row,
                                                            column
                                                        )}
                                                    </td>
                                                ))}
                                                {(resource.form ||
                                                    resource.rowActions ||
                                                    resource.getDeleteEndpoint) && (
                                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {resource.form && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            openEditForm(
                                                                                row
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="h-4 w-4" /> {translate('text.edit_0963749f')} </Button>
                                                                )}
                                                                {resource.rowActions?.map(
                                                                    (action) => (
                                                                        <Button
                                                                            key={
                                                                                action.label
                                                                            }
                                                                            size="sm"
                                                                            variant={
                                                                                action.variant ||
                                                                                'outline'
                                                                            }
                                                                            onClick={() =>
                                                                                action.onClick?.(
                                                                                    row
                                                                                )
                                                                            }
                                                                        >
                                                                            {action.label}
                                                                        </Button>
                                                                    )
                                                                )}
                                                                {resource.getDeleteEndpoint && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="danger"
                                                                        isLoading={
                                                                            deleteMutation.isPending
                                                                        }
                                                                        onClick={() =>
                                                                            handleDelete(
                                                                                row
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" /> {translate('text.delete')} </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {rows.length > 0 && (
                        <Pagination
                            page={pagination?.page || page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    )}
                </CardBody>
            </Card>

            {resource.form && (
                <Modal
                    open={formState.open}
                    title={
                        formState.mode === 'edit'
                            ? translate('text.edit_value', { value0: resource.form.title })
                            : translate('text.add_value', { value0: resource.form.title })
                    }
                    onClose={closeForm}
                    panelClassName="max-w-5xl"
                >
                    {formState.mode === 'edit' && detailQuery.isLoading ? (
                        <Loading label={translate('text.loading_data')} />
                    ) : (
                        <AdminResourceForm
                            form={resource.form}
                            mode={formState.mode}
                            initialData={formInitialData}
                            optionData={{
                                categories: categoryOptions,
                            }}
                            isLoading={formMutation.isPending}
                            error={formMutation.error}
                            onCancel={closeForm}
                            onSubmit={handleSave}
                        />
                    )}
                </Modal>
            )}
        </div>
    );
}
