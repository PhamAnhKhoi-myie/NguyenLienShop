import { translate } from '../../../shared/i18n/index';
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
    mon: translate('text.monday'),
    tue: translate('text.tuesday'),
    wed: translate('text.wednesday'),
    thu: translate('text.thursday'),
    fri: translate('text.friday'),
    sat: translate('text.saturday'),
    sun: translate('text.sunday'),
    holiday: translate('text.holiday'),
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
            <p className="text-sm text-[var(--color-text-muted)]"> {translate('text.opening_hours_have_not_been_configured')} </p>
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
                            <p className="text-sm font-medium text-[var(--color-primary-hover)]"> {translate('text.admin')} </p>
                            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]"> {translate('text.shop_information')} </h1>
                            <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.admin_manager_manages_contact_information_opening_hours_and_shop_status')} </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={openForm}>
                                {shopInfo ? (
                                    <Pencil className="h-4 w-4" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                {shopInfo ? translate('text.edit_information') : translate('text.create_information')}
                            </Button>
                            <Button
                                variant="outline"
                                isLoading={shopInfoQuery.isFetching}
                                onClick={() => shopInfoQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" /> {translate('text.reload')} </Button>
                            <Button
                                variant={shopInfo?.is_active ? 'warning' : 'secondary'}
                                disabled={!shopInfo}
                                isLoading={toggleStatusMutation.isPending}
                                onClick={handleToggleStatus}
                            >
                                <Power className="h-4 w-4" />
                                {shopInfo?.is_active ? translate('text.turn_off_shop') : translate('text.turn_on_shop')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardBody>
                    {shopInfoQuery.isLoading ? (
                        <Loading label={translate('text.loading_shop_information')} />
                    ) : shopInfoQuery.isError && !isNotFound ? (
                        <EmptyState
                            icon={Store}
                            title={translate('text.unable_to_download_shop_information')}
                            description={shopInfoQuery.error.message}
                        />
                    ) : !shopInfo ? (
                        <EmptyState
                            icon={Store}
                            title={translate('text.no_shop_information_yet')}
                            description={translate('text.create_shop_information_for_public_contact_social_link_and_opening_hours')}
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label={translate('text.shop_name')} value={shopInfo.shop_name} />
                                <InfoLine label={translate('text.email_84add5b2')} value={shopInfo.email} />
                                <InfoLine label={translate('text.phone')} value={shopInfo.phone} />
                                <InfoLine label={translate('text.address')} value={shopInfo.address} />
                                <InfoLine label={translate('text.shipping_partner')} value={shopInfo.shipping_partner} />
                                <div className="flex justify-between gap-4 py-3">
                                    <span className="text-sm text-[var(--color-text-muted)]"> {translate('text.status')} </span>
                                    <StatusBadge
                                        value={shopInfo.is_active}
                                        label={
                                            shopInfo.is_active
                                                ? translate('text.on')
                                                : translate('text.off')
                                        }
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <InfoLine label={translate('text.facebook')} value={shopInfo.social_links?.facebook} />
                                <InfoLine label={translate('text.zalo')} value={shopInfo.social_links?.zalo} />
                                <InfoLine label={translate('text.instagram')} value={shopInfo.social_links?.instagram} />
                                <InfoLine label={translate('text.shoppe')} value={shopInfo.social_links?.shoppe} />
                                <InfoLine label={translate('text.tiktok')} value={shopInfo.social_links?.tiktok} />
                                <InfoLine label={translate('text.google_map')} value={shopInfo.map_embed_url} />
                                <InfoLine
                                    label={translate('text.ministry_of_industry_and_trade_announced')}
                                    value={shopInfo.certification_links?.ministry_notified}
                                />
                                <InfoLine
                                    label={translate('text.ministry_of_industry_and_trade_registered')}
                                    value={shopInfo.certification_links?.ministry_registered}
                                />
                                <InfoLine
                                    label={translate('text.backup_certificate')}
                                    value={shopInfo.certification_links?.extra}
                                />
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4 lg:col-span-2">
                                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-main)]"> {translate('text.opening_hours')} </h2>
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
                        ? translate('text.edit_shop_information')
                        : translate('text.create_shop_information')
                }
                onClose={closeForm}
                panelClassName="max-w-5xl"
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
