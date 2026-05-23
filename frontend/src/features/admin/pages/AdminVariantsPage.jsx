import { useState } from 'react';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Select from '../../../shared/components/Select';
import { useAdminList, useAdminMutation } from '../hooks/useAdminResource';
import { getRows, renderAdminCell } from '../utils/adminFormat';

const variantColumns = [
    { key: 'name', header: 'Biến thể', value: (row) => row.name || row.label || row.size },
    { key: 'sku', header: 'SKU', value: 'sku' },
    { key: 'material', header: 'Chất liệu', value: (row) => row.material || row.fabric_type },
    { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
    { key: 'stock', header: 'Tồn kho', value: (row) => row.stock?.available ?? row.available_stock },
];

const unitColumns = [
    { key: 'name', header: 'Đơn vị', value: (row) => row.name || row.label || row.unit_label || row.display_name },
    { key: 'pack_size', header: 'Quy cách', value: 'pack_size' },
    { key: 'base_price', header: 'Giá nền', value: (row) => row.base_price || row.price || row.price_range?.min, type: 'money' },
    { key: 'is_default', header: 'Mặc định', value: 'is_default', type: 'status' },
    { key: 'status', header: 'Trạng thái', value: 'status', type: 'status' },
];

function AdminMiniTable({ columns, rows, emptyTitle, onDelete }) {
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
                        <tr key={row.id || row._id || index}>
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className="whitespace-nowrap px-4 py-3"
                                >
                                    {renderAdminCell(row, column)}
                                </td>
                            ))}
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => onDelete(row)}
                                >
                                    Xóa
                                </Button>
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
        (variant) => variant.id === selectedVariantId
    )
        ? selectedVariantId
        : variants[0]?.id || '';
    const unitQuery = useAdminList(
        activeVariantId ? `/variants/${activeVariantId}/units` : '',
        {},
        { enabled: Boolean(activeVariantId) }
    );
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const units = getRows(unitQuery.data);
    const selectedProduct = products.find(
        (product) => product.id === activeProductId
    );

    const handleDeleteVariant = async (variant) => {
        const confirmed = window.confirm('Xóa biến thể này?');

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/variants/${variant.id || variant._id}`,
        });
        variantQuery.refetch();
    };

    const handleDeleteUnit = async (unit) => {
        const confirmed = window.confirm('Xóa đơn vị bán này?');

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/variant-units/${unit.id || unit._id}`,
        });
        unitQuery.refetch();
    };

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
                        <h2 className="font-semibold text-[var(--color-text-main)]">
                            Variants {selectedProduct ? `· ${selectedProduct.name}` : ''}
                        </h2>
                    </CardHeader>
                    <CardBody>
                        {variantQuery.isLoading ? (
                            <Loading label="Đang tải variants..." />
                        ) : (
                            <AdminMiniTable
                                columns={variantColumns}
                                rows={variants}
                                emptyTitle="Sản phẩm chưa có biến thể"
                                onDelete={handleDeleteVariant}
                            />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="space-y-3">
                            <h2 className="font-semibold text-[var(--color-text-main)]">
                                Variant units
                            </h2>
                            <Select
                                value={activeVariantId}
                                onChange={(event) =>
                                    setSelectedVariantId(event.target.value)
                                }
                            >
                                {variants.map((variant) => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.name || variant.label || variant.size}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {unitQuery.isLoading ? (
                            <Loading label="Đang tải đơn vị bán..." />
                        ) : (
                            <AdminMiniTable
                                columns={unitColumns}
                                rows={units}
                                emptyTitle="Biến thể chưa có đơn vị bán"
                                onDelete={handleDeleteUnit}
                            />
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
