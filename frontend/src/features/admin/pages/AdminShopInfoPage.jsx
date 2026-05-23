import { Pencil, Plus, Power, RefreshCw, Store } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import AdminResourceForm from '../components/AdminResourceForm';
import { useAdminDetail, useAdminMutation } from '../hooks/useAdminResource';
import { shopInfoFormConfig } from '../resources/adminContentForms';
import { StatusBadge } from '../utils/adminFormat';

const dayLabels = {
    mon: 'Thứ 2',
    tue: 'Thứ 3',
    wed: 'Thứ 4',
    thu: 'Thứ 5',
    fri: 'Thứ 6',
    sat: 'Thứ 7',
    sun: 'Chủ nhật',
};

function InfoLine({ label, value }) {
    return (
        <div className="flex justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
            <span className="text-sm text-[var(--color-text-muted)]">
                {label}
            </span>
            <span className="text-right text-sm font-medium text-[var(--color-text-main)]">
                {value || '-'}
            </span>
        </div>
    );
}

function WorkingHours({ hours = [] }) {
    if (!hours.length) {
        return (
            <p className="text-sm text-[var(--color-text-muted)]">
                Chưa cấu hình giờ mở cửa.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {hours.map((hour) => (
                <div
                    key={hour.day}
                    className="flex items-center justify-between gap-4 rounded-md bg-[var(--color-background)] px-3 py-2"
                >
                    <span className="text-sm font-medium text-[var(--color-text-main)]">
                        {dayLabels[hour.day] || hour.day}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                        {hour.open} - {hour.close}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function AdminShopInfoPage() {
    const [formOpen, setFormOpen] = useState(false);
    const shopInfoQuery = useAdminDetail('/shop-info');
    const createMutation = useAdminMutation({ method: 'post' });
    const updateMutation = useAdminMutation({ method: 'patch' });
    const toggleStatusMutation = useAdminMutation({ method: 'patch' });
    const shopInfo = shopInfoQuery.data?.data;
    const formMode = shopInfo ? 'edit' : 'create';
    const formMutation = shopInfo ? updateMutation : createMutation;
    const isNotFound =
        shopInfoQuery.isError && shopInfoQuery.error?.status === 404;

    const openForm = () => {
        createMutation.reset();
        updateMutation.reset();
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
    };

    const handleSave = async (values) => {
        await formMutation.mutateAsync({
            endpoint: '/shop-info',
            payload: shopInfoFormConfig.toPayload(values, {
                mode: formMode,
                initialData: shopInfo || {},
            }),
        });
        closeForm();
        await shopInfoQuery.refetch();
    };

    const handleToggleStatus = async () => {
        if (!shopInfo) {
            return;
        }

        await toggleStatusMutation.mutateAsync({
            endpoint: '/shop-info/status',
            payload: {
                is_active: !shopInfo.is_active,
            },
        });
        await shopInfoQuery.refetch();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                                Admin
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                                Thông tin shop
                            </h1>
                            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                ADMIN/MANAGER quản lý thông tin liên hệ, giờ mở cửa và trạng thái shop.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={openForm}>
                                {shopInfo ? (
                                    <Pencil className="h-4 w-4" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                {shopInfo ? 'Sửa thông tin' : 'Tạo thông tin'}
                            </Button>
                            <Button
                                variant="outline"
                                isLoading={shopInfoQuery.isFetching}
                                onClick={() => shopInfoQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Tải lại
                            </Button>
                            <Button
                                variant={shopInfo?.is_active ? 'warning' : 'secondary'}
                                disabled={!shopInfo}
                                isLoading={toggleStatusMutation.isPending}
                                onClick={handleToggleStatus}
                            >
                                <Power className="h-4 w-4" />
                                {shopInfo?.is_active ? 'Tắt shop' : 'Bật shop'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {shopInfoQuery.isLoading ? (
                        <Loading label="Đang tải thông tin shop..." />
                    ) : shopInfoQuery.isError && !isNotFound ? (
                        <EmptyState
                            icon={Store}
                            title="Không tải được thông tin shop"
                            description={shopInfoQuery.error.message}
                        />
                    ) : !shopInfo ? (
                        <EmptyState
                            icon={Store}
                            title="Chưa có thông tin shop"
                            description="Tạo thông tin shop để public contact, social link và giờ mở cửa cho khách."
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label="Tên shop" value={shopInfo.shop_name} />
                                <InfoLine label="Email" value={shopInfo.email} />
                                <InfoLine label="Điện thoại" value={shopInfo.phone} />
                                <InfoLine label="Địa chỉ" value={shopInfo.address} />
                                <div className="flex justify-between gap-4 py-3">
                                    <span className="text-sm text-[var(--color-text-muted)]">
                                        Trạng thái
                                    </span>
                                    <StatusBadge
                                        value={shopInfo.is_active}
                                        label={
                                            shopInfo.is_active
                                                ? 'Đang bật'
                                                : 'Đang tắt'
                                        }
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label="Facebook" value={shopInfo.social_links?.facebook} />
                                <InfoLine label="Zalo" value={shopInfo.social_links?.zalo} />
                                <InfoLine label="Instagram" value={shopInfo.social_links?.instagram} />
                                <InfoLine label="Shoppe" value={shopInfo.social_links?.shoppe} />
                                <InfoLine label="Google Map" value={shopInfo.map_embed_url} />
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4 lg:col-span-2">
                                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-main)]">
                                    Giờ mở cửa
                                </h2>
                                <WorkingHours hours={shopInfo.working_hours} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={formOpen}
                title={
                    formMode === 'edit'
                        ? 'Sửa thông tin shop'
                        : 'Tạo thông tin shop'
                }
                onClose={closeForm}
                panelClassName="max-w-4xl"
            >
                <AdminResourceForm
                    form={shopInfoFormConfig}
                    mode={formMode}
                    initialData={shopInfo || {}}
                    optionData={{}}
                    isLoading={formMutation.isPending}
                    error={formMutation.error}
                    onCancel={closeForm}
                    onSubmit={handleSave}
                />
            </Modal>
        </div>
    );
}
