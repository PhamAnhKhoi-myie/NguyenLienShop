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
    { key: 'size', header: 'Kích thước', value: 'size' },
    { key: 'sku', header: 'SKU', value: 'sku' },
    { key: 'fabric_type', header: 'Chất liệu', value: 'fabric_type' },
    { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
    { key: 'stock', header: 'Tồn kho', value: (row) => row.stock?.available ?? row.available_stock },
];

const unitColumns = [
    { key: 'display_name', header: 'Đơn vị', value: 'display_name' },
    { key: 'pack_size', header: 'Quy cách', value: 'pack_size' },
    {
        key: 'base_price',
        header: 'Giá thấp nhất',
        value: (row) =>
            row.price_tiers?.[0]?.unit_price ||
            row.pricing?.min_price ||
            row.price_range?.min,
        type: 'money',
    },
    { key: 'is_default', header: 'Mặc định', value: 'is_default', type: 'status' },
    { key: 'currency', header: 'Tiền tệ', value: 'currency' },
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
                        <th className="whitespace-nowrap px-4 py-3 text-right">
                            Tác vụ
                        </th>
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
                                        <Pencil className="h-4 w-4" />
                                        Sửa
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => onDelete(row)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Xóa
                                    </Button>
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
    const products = getRows(productQuery.data);
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
        const confirmed = window.confirm('Xóa biến thể này?');

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
        const confirmed = window.confirm('Xóa đơn vị bán này?');

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
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Biến thể và đơn vị bán
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN/MANAGER quản lý variants và variant units theo từng sản phẩm.
                    </p>
                </CardHeader>
                <CardBody className="space-y-5">
                    {productQuery.isLoading ? (
                        <Loading label="Đang tải sản phẩm..." />
                    ) : products.length === 0 ? (
                        <EmptyState
                            title="Chưa có sản phẩm"
                            description="Cần tạo sản phẩm trước khi tạo biến thể."
                        />
                    ) : (
                        <Select
                            label="Chọn sản phẩm"
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
                                <h2 className="font-semibold text-[var(--color-text-main)]">
                                    Variants {selectedProduct ? `· ${selectedProduct.name}` : ''}
                                </h2>
                                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                    Kích thước, chất liệu và trạng thái bán của sản phẩm.
                                </p>
                            </div>
                            <Button
                                disabled={!activeProductId}
                                onClick={openCreateVariant}
                            >
                                <Plus className="h-4 w-4" />
                                Thêm variant
                            </Button>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {variantQuery.isLoading ? (
                            <Loading label="Đang tải variants..." />
                        ) : (
                            <AdminMiniTable
                                columns={variantColumns}
                                rows={variants}
                                emptyTitle="Sản phẩm chưa có biến thể"
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
                                    <h2 className="font-semibold text-[var(--color-text-main)]">
                                        Variant units
                                    </h2>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                        Quy cách đóng gói, bậc giá và điều kiện đặt hàng.
                                    </p>
                                </div>
                                <Button
                                    disabled={!activeVariantId}
                                    onClick={openCreateUnit}
                                >
                                    <Plus className="h-4 w-4" />
                                    Thêm unit
                                </Button>
                            </div>

                            {variants.length > 0 && (
                                <Select
                                    label="Chọn variant"
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
                            <EmptyState title="Chọn hoặc tạo variant trước" />
                        ) : unitQuery.isLoading ? (
                            <Loading label="Đang tải đơn vị bán..." />
                        ) : (
                            <AdminMiniTable
                                columns={unitColumns}
                                rows={units}
                                emptyTitle="Biến thể chưa có đơn vị bán"
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
                        ? 'Sửa biến thể'
                        : 'Thêm biến thể'
                }
                onClose={closeVariantForm}
                panelClassName="max-w-2xl"
            >
                {variantFormState.mode === 'edit' && variantDetailQuery.isLoading ? (
                    <Loading label="Đang tải biến thể..." />
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
                        ? 'Sửa đơn vị bán'
                        : `Thêm đơn vị bán${selectedVariant ? ` · ${selectedVariant.size}` : ''}`
                }
                onClose={closeUnitForm}
                panelClassName="max-w-3xl"
            >
                {unitFormState.mode === 'edit' && unitDetailQuery.isLoading ? (
                    <Loading label="Đang tải đơn vị bán..." />
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
