import { translate } from '../../../shared/i18n/index';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Select from '../../../shared/components/Select';
import AdminResourceForm from '../components/AdminResourceForm';
import {
    useAdminDetail,
    useAdminList,
    useAdminMutation,
} from '../hooks/useAdminResource';
import {
    variantFormConfig,
    variantUnitFormConfig,
} from '../resources/adminVariantForms';
import { getRows, renderAdminCell } from '../utils/adminFormat';

const variantColumns = [
    { key: 'size', header: translate('text.size'), value: 'size' },
    { key: 'sku', header: translate('text.sku'), value: 'sku' },
    { key: 'fabric_type', header: translate('text.material'), value: 'fabric_type' },
    { key: 'status', header: translate('text.status'), value: 'status', type: 'status' },
    { key: 'stock', header: translate('text.inventory'), value: (row) => row.stock?.available ?? row.available_stock },
];

const unitColumns = [
    { key: 'display_name', header: translate('text.unit'), value: 'display_name' },
    { key: 'pack_size', header: translate('text.specification'), value: 'pack_size' },
    {
        key: 'base_price',
        header: translate('text.lowest_price'),
        value: (row) =>
            row.price_tiers?.[0]?.unit_price ||
            row.pricing?.min_price ||
            row.price_range?.min,
        type: 'money',
    },
    {
        key: 'promotion',
        header: translate('text.discounted'),
        value: (row) => Boolean(row.promotion?.is_active),
        type: 'status',
        labelMap: {
            true: translate('text.yes'),
            false: translate('text.no'),
        },
    },
    { key: 'is_default', header: translate('text.default'), value: 'is_default', type: 'status' },
    { key: 'currency', header: translate('text.currency'), value: 'currency' },
];

function getRowId(row) {
    return row.id || row._id;
}

function AdminMiniTable({ columns, rows, emptyTitle, onEdit, onDelete }) {
    if (rows.length === 0) {
        return <EmptyState title={emptyTitle} />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead>
                    <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                        {columns.map((column) => (
                            <th key={column.key} className="whitespace-nowrap px-4 py-3">
                                {column.header}
                            </th>
                        ))}
                        <th className="whitespace-nowrap px-4 py-3 text-right"> {translate('text.task')} </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {rows.map((row, index) => (
                        <tr key={getRowId(row) || index}>
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className="whitespace-nowrap px-4 py-3"
                                >
                                    {renderAdminCell(row, column)}
                                </td>
                            ))}
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onEdit(row)}
                                    >
                                        <Pencil className="h-4 w-4" /> {translate('text.edit_0963749f')} </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => onDelete(row)}
                                    >
                                        <Trash2 className="h-4 w-4" /> {translate('text.delete')} </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminVariantsPage() {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [variantFormState, setVariantFormState] = useState({
        open: false,
        mode: 'create',
        row: null,
    });
    const [unitFormState, setUnitFormState] = useState({
        open: false,
        mode: 'create',
        row: null,
    });
    const productQuery = useAdminList('/products', { page: 1, limit: 100 });
    const products = getRows(productQuery.data).filter(
        (product) => product.product_type !== 'SIMPLE'
    );
    const activeProductId = selectedProductId || products[0]?.id || '';
    const variantQuery = useAdminList(
        activeProductId ? `/products/${activeProductId}/variants` : '',
        {},
        { enabled: Boolean(activeProductId) }
    );
    const variants = getRows(variantQuery.data);
    const activeVariantId = variants.some(
        (variant) => getRowId(variant) === selectedVariantId
    )
        ? selectedVariantId
        : variants[0]?.id || '';
    const unitQuery = useAdminList(
        activeVariantId ? `/variants/${activeVariantId}/units` : '',
        {},
        { enabled: Boolean(activeVariantId) }
    );
    const units = getRows(unitQuery.data);
    const selectedProduct = products.find(
        (product) => product.id === activeProductId
    );
    const selectedVariant = variants.find(
        (variant) => variant.id === activeVariantId
    );
    const variantDetailEndpoint =
        variantFormState.open && variantFormState.mode === 'edit'
            ? `/variants/${getRowId(variantFormState.row)}`
            : null;
    const unitDetailEndpoint =
        unitFormState.open && unitFormState.mode === 'edit'
            ? `/variant-units/${getRowId(unitFormState.row)}`
            : null;
    const variantDetailQuery = useAdminDetail(variantDetailEndpoint, {
        enabled: Boolean(variantDetailEndpoint),
    });
    const unitDetailQuery = useAdminDetail(unitDetailEndpoint, {
        enabled: Boolean(unitDetailEndpoint),
    });
    const createVariantMutation = useAdminMutation({ method: 'post' });
    const updateVariantMutation = useAdminMutation({ method: 'patch' });
    const deleteVariantMutation = useAdminMutation({ method: 'delete' });
    const createUnitMutation = useAdminMutation({ method: 'post' });
    const updateUnitMutation = useAdminMutation({ method: 'patch' });
    const deleteUnitMutation = useAdminMutation({ method: 'delete' });
    const validateTiersMutation = useAdminMutation({ method: 'post' });

    const openCreateVariant = () => {
        createVariantMutation.reset();
        updateVariantMutation.reset();
        setVariantFormState({
            open: true,
            mode: 'create',
            row: null,
        });
    };

    const openEditVariant = (row) => {
        createVariantMutation.reset();
        updateVariantMutation.reset();
        setVariantFormState({
            open: true,
            mode: 'edit',
            row,
        });
    };

    const closeVariantForm = () => {
        setVariantFormState({
            open: false,
            mode: 'create',
            row: null,
        });
    };

    const openCreateUnit = () => {
        createUnitMutation.reset();
        updateUnitMutation.reset();
        validateTiersMutation.reset();
        setUnitFormState({
            open: true,
            mode: 'create',
            row: null,
        });
    };

    const openEditUnit = (row) => {
        createUnitMutation.reset();
        updateUnitMutation.reset();
        validateTiersMutation.reset();
        setUnitFormState({
            open: true,
            mode: 'edit',
            row,
        });
    };

    const closeUnitForm = () => {
        setUnitFormState({
            open: false,
            mode: 'create',
            row: null,
        });
    };

    const handleSaveVariant = async (values) => {
        const initialData = variantDetailQuery.data?.data || variantFormState.row || {};
        const payload = variantFormConfig.toPayload(values, {
            mode: variantFormState.mode,
            initialData,
        });

        if (variantFormState.mode === 'edit') {
            await updateVariantMutation.mutateAsync({
                endpoint: `/variants/${getRowId(initialData)}`,
                payload,
            });
        } else {
            await createVariantMutation.mutateAsync({
                endpoint: `/products/${activeProductId}/variants`,
                payload,
            });
        }

        closeVariantForm();
        await variantQuery.refetch();
    };

    const handleSaveUnit = async (values) => {
        const initialData = unitDetailQuery.data?.data || unitFormState.row || {};
        const payload = variantUnitFormConfig.toPayload(values, {
            mode: unitFormState.mode,
            initialData,
        });

        await validateTiersMutation.mutateAsync({
            endpoint: '/variant-units/validate-tiers',
            payload: {
                price_tiers: payload.price_tiers,
            },
        });

        if (unitFormState.mode === 'edit') {
            await updateUnitMutation.mutateAsync({
                endpoint: `/variant-units/${getRowId(initialData)}`,
                payload,
            });
        } else {
            await createUnitMutation.mutateAsync({
                endpoint: `/variants/${activeVariantId}/units`,
                payload,
            });
        }

        closeUnitForm();
        await unitQuery.refetch();
        await variantQuery.refetch();
    };

    const handleDeleteVariant = async (variant) => {
        const confirmed = window.confirm(translate('text.delete_this_variant'));

        if (!confirmed) {
            return;
        }

        await deleteVariantMutation.mutateAsync({
            endpoint: `/variants/${getRowId(variant)}`,
        });
        setSelectedVariantId('');
        await variantQuery.refetch();
    };

    const handleDeleteUnit = async (unit) => {
        const confirmed = window.confirm(translate('text.delete_this_sales_unit'));

        if (!confirmed) {
            return;
        }

        await deleteUnitMutation.mutateAsync({
            endpoint: `/variant-units/${getRowId(unit)}`,
        });
        await unitQuery.refetch();
        await variantQuery.refetch();
    };

    const variantFormInitialData =
        variantFormState.mode === 'edit'
            ? variantDetailQuery.data?.data || variantFormState.row
            : null;
    const unitFormInitialData =
        unitFormState.mode === 'edit'
            ? unitDetailQuery.data?.data || unitFormState.row
            : null;
    const variantFormMutation =
        variantFormState.mode === 'edit'
            ? updateVariantMutation
            : createVariantMutation;
    const unitFormMutation =
        unitFormState.mode === 'edit' ? updateUnitMutation : createUnitMutation;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.variant_and_unit_of_sale')} </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_manager_manages_variants_and_variant_units_for_each_product')} </p>
                </CardHeader>
                <CardBody className="space-y-5">
                    {productQuery.isLoading ? (
                        <Loading label={translate('text.loading_products')} />
                    ) : products.length === 0 ? (
                        <EmptyState
                            title={translate('text.no_products_yet')}
                            description={translate('text.need_to_create_a_product_before_creating_a_variation')}
                        />
                    ) : (
                        <Select
                            label={translate('text.select_product')}
                            value={activeProductId}
                            onChange={(event) => {
                                setSelectedProductId(event.target.value);
                                setSelectedVariantId('');
                            }}
                        >
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </Select>
                    )}
                </CardBody>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.variants')} {selectedProduct ? `· ${selectedProduct.name}` : ''}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.size_material_and_sales_status_of_the_product')} </p>
                            </div>
                            <Button
                                disabled={!activeProductId}
                                onClick={openCreateVariant}
                            >
                                <Plus className="h-4 w-4" /> {translate('text.add_variant')} </Button>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {variantQuery.isLoading ? (
                            <Loading label={translate('text.loading_variants')} />
                        ) : (
                            <AdminMiniTable
                                columns={variantColumns}
                                rows={variants}
                                emptyTitle={translate('text.product_has_no_variation_yet')}
                                onEdit={openEditVariant}
                                onDelete={handleDeleteVariant}
                            />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h2 className="font-semibold text-[var(--color-text-main)]"> {translate('text.variant_units')} </h2>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.packaging_specifications_price_tiers_and_ordering_conditions')} </p>
                                </div>
                                <Button
                                    disabled={!activeVariantId}
                                    onClick={openCreateUnit}
                                >
                                    <Plus className="h-4 w-4" /> {translate('text.add_unit')} </Button>
                            </div>

                            {variants.length > 0 && (
                                <Select
                                    label={translate('text.select_variant')}
                                    value={activeVariantId}
                                    onChange={(event) =>
                                        setSelectedVariantId(event.target.value)
                                    }
                                >
                                    {variants.map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                            {variant.size} · {variant.fabric_type}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    </CardHeader>
                    <CardBody>
                        {!activeVariantId ? (
                            <EmptyState title={translate('text.select_or_create_variant_before')} />
                        ) : unitQuery.isLoading ? (
                            <Loading label={translate('text.loading_sales_units')} />
                        ) : (
                            <AdminMiniTable
                                columns={unitColumns}
                                rows={units}
                                emptyTitle={translate('text.unavailable_variant')}
                                onEdit={openEditUnit}
                                onDelete={handleDeleteUnit}
                            />
                        )}
                    </CardBody>
                </Card>
            </div>

            <Modal
                open={variantFormState.open}
                title={
                    variantFormState.mode === 'edit'
                        ? translate('text.fix_variant')
                        : translate('text.add_variation')
                }
                onClose={closeVariantForm}
                panelClassName="max-w-4xl"
            >
                {variantFormState.mode === 'edit' && variantDetailQuery.isLoading ? (
                    <Loading label={translate('text.loading_variant')} />
                ) : (
                    <AdminResourceForm
                        form={variantFormConfig}
                        mode={variantFormState.mode}
                        initialData={variantFormInitialData}
                        optionData={{}}
                        isLoading={variantFormMutation.isPending}
                        error={variantFormMutation.error}
                        onCancel={closeVariantForm}
                        onSubmit={handleSaveVariant}
                    />
                )}
            </Modal>

            <Modal
                open={unitFormState.open}
                title={
                    unitFormState.mode === 'edit'
                        ? translate('text.edit_sales_unit')
                        : translate('text.add_sales_unit_value', { value0: selectedVariant ? ` · ${selectedVariant.size}` : '' })
                }
                onClose={closeUnitForm}
                panelClassName="max-w-5xl"
            >
                {unitFormState.mode === 'edit' && unitDetailQuery.isLoading ? (
                    <Loading label={translate('text.loading_sales_units')} />
                ) : (
                    <AdminResourceForm
                        form={variantUnitFormConfig}
                        mode={unitFormState.mode}
                        initialData={unitFormInitialData}
                        optionData={{}}
                        isLoading={
                            unitFormMutation.isPending ||
                            validateTiersMutation.isPending
                        }
                        error={
                            validateTiersMutation.error ||
                            unitFormMutation.error
                        }
                        onCancel={closeUnitForm}
                        onSubmit={handleSaveUnit}
                    />
                )}
            </Modal>
        </div>
    );
}
