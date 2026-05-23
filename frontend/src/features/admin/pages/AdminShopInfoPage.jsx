import { RefreshCw, Store } from 'lucide-react';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import { useAdminDetail, useAdminMutation } from '../hooks/useAdminResource';
import { StatusBadge } from '../utils/adminFormat';

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

export default function AdminShopInfoPage() {
    const shopInfoQuery = useAdminDetail('/shop-info');
    const toggleStatusMutation = useAdminMutation({ method: 'patch' });
    const shopInfo = shopInfoQuery.data?.data;

    const handleToggleStatus = async () => {
        await toggleStatusMutation.mutateAsync({
            endpoint: '/shop-info/status',
        });
        shopInfoQuery.refetch();
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
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                isLoading={shopInfoQuery.isFetching}
                                onClick={() => shopInfoQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Tải lại
                            </Button>
                            <Button
                                isLoading={toggleStatusMutation.isPending}
                                onClick={handleToggleStatus}
                            >
                                Đổi trạng thái
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {shopInfoQuery.isLoading ? (
                        <Loading label="Đang tải thông tin shop..." />
                    ) : !shopInfo ? (
                        <EmptyState
                            icon={Store}
                            title="Chưa có thông tin shop"
                            description="Có thể tạo dữ liệu shop-info ở bước form quản trị tiếp theo."
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label="Tên shop" value={shopInfo.name || shopInfo.shop_name} />
                                <InfoLine label="Email" value={shopInfo.email} />
                                <InfoLine label="Điện thoại" value={shopInfo.phone} />
                                <InfoLine label="Địa chỉ" value={shopInfo.address} />
                                <div className="flex justify-between gap-4 py-3">
                                    <span className="text-sm text-[var(--color-text-muted)]">
                                        Trạng thái
                                    </span>
                                    <StatusBadge
                                        value={shopInfo.is_active ?? shopInfo.status}
                                        label={
                                            shopInfo.is_active === false
                                                ? 'Đang tắt'
                                                : 'Đang bật'
                                        }
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label="Facebook" value={shopInfo.social_links?.facebook} />
                                <InfoLine label="Zalo" value={shopInfo.social_links?.zalo} />
                                <InfoLine label="Website" value={shopInfo.website} />
                                <InfoLine label="Mô tả" value={shopInfo.description} />
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
