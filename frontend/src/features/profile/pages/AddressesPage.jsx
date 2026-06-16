import { translate } from '../../../shared/i18n/index';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit3, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Select from '../../../shared/components/Select';
import Textarea from '../../../shared/components/Textarea';
import { useProvinces, useWards } from '../../../shared/hooks/useLocations';
import AccountNav from '../components/AccountNav';
import {
    useAccountAddresses,
    useCreateAccountAddress,
    useDeleteAccountAddress,
    useSetDefaultAccountAddress,
    useUpdateAccountAddress,
} from '../hooks/useProfile';

const addressSchema = z.object({
    receiver_name: z.string().trim().min(1, translate('text.please_enter_recipient')),
    phone: z
        .string()
        .trim()
        .regex(/^(0|\+84)[0-9]{9}$/, translate('text.invalid_phone_number')),
    province_code: z.string().trim().min(1, translate('text.please_select_province_city')),
    ward_code: z.string().trim().min(1, translate('text.please_select_ward_commune')),
    detail: z.string().trim().min(5, translate('text.specific_address_of_at_least_5_characters')),
    note: z.string().trim().max(500, translate('text.note_maximum_500_characters')).optional(),
    is_default: z.boolean().default(false),
});

const emptyAddress = {
    receiver_name: '',
    phone: '',
    province_code: '',
    ward_code: '',
    detail: '',
    note: '',
    is_default: false,
};

function toFormValues(address) {
    if (!address) {
        return emptyAddress;
    }

    return {
        receiver_name: address.receiver_name || '',
        phone: address.phone || '',
        province_code: address.province_code || '',
        ward_code: address.ward_code || '',
        detail: address.detail || '',
        note: address.note || '',
        is_default: Boolean(address.is_default),
    };
}

function formatAddress(address) {
    return (
        address.full_address ||
        [
            address.detail,
            address.ward_name,
            address.province_name,
            address.address_line_1,
            address.address_line_2,
            address.ward,
            address.district,
            address.city,
        ]
            .filter(Boolean)
            .join(', ')
    );
}

function AddressForm({ address, isSaving, onSubmit }) {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        clearErrors,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(addressSchema),
        defaultValues: toFormValues(address),
    });

    const selectedProvinceCode = useWatch({
        control,
        name: 'province_code',
    });
    const provincesQuery = useProvinces();
    const wardsQuery = useWards(selectedProvinceCode);
    const provinces = provincesQuery.data?.data || [];
    const wards = wardsQuery.data?.data || [];
    const provinceField = register('province_code');
    const wardField = register('ward_code');

    const submit = (values) => {
        onSubmit({
            receiver_name: values.receiver_name.trim(),
            phone: values.phone.trim(),
            province_code: values.province_code,
            ward_code: values.ward_code,
            detail: values.detail.trim(),
            note: values.note?.trim() || null,
            is_default: Boolean(values.is_default),
        });
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label={translate('text.recipient')}
                    error={errors.receiver_name?.message}
                    {...register('receiver_name')}
                />
                <Input
                    label={translate('text.phone_number')}
                    placeholder="0901234567"
                    error={errors.phone?.message}
                    {...register('phone')}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label={translate('text.province_city')}
                    error={errors.province_code?.message}
                    disabled={provincesQuery.isLoading}
                    {...provinceField}
                    onChange={(event) => {
                        provinceField.onChange(event);
                        setValue('ward_code', '', {
                            shouldDirty: true,
                            shouldValidate: true,
                        });
                    }}
                >
                    <option value="">{translate('text.select_province_city')}</option>
                    {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                            {province.name}
                        </option>
                    ))}
                </Select>

                <Select
                    label={translate('text.ward_commune')}
                    error={errors.ward_code?.message}
                    disabled={!selectedProvinceCode || wardsQuery.isLoading}
                    {...wardField}
                    onChange={(event) => {
                        wardField.onChange(event);
                        clearErrors('ward_code');
                    }}
                >
                    <option value="">{translate('text.select_ward_commune')}</option>
                    {wards.map((ward) => (
                        <option key={ward.code} value={ward.code}>
                            {ward.name}
                        </option>
                    ))}
                </Select>
            </div>

            <Input
                label={translate('text.specific_address')}
                placeholder={translate('text.house_number_name_of_street_alley_village_hamlet')}
                error={errors.detail?.message}
                {...register('detail')}
            />

            <Textarea
                label={translate('text.delivery_notes')}
                rows={3}
                error={errors.note?.message}
                {...register('note')}
            />

            <label className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    {...register('is_default')}
                /> {translate('text.set_as_default_address')} </label>

            <Button type="submit" isLoading={isSaving}>
                {address ? translate('text.update_address') : translate('text.add_address')}
            </Button>
        </form>
    );
}

export default function AddressesPage() {
    const addressesQuery = useAccountAddresses();
    const createAddressMutation = useCreateAccountAddress();
    const updateAddressMutation = useUpdateAccountAddress();
    const deleteAddressMutation = useDeleteAccountAddress();
    const setDefaultAddressMutation = useSetDefaultAccountAddress();
    const [editingAddress, setEditingAddress] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const addresses = addressesQuery.data?.data || [];

    const openCreateModal = () => {
        setEditingAddress(null);
        setIsModalOpen(true);
    };

    const openEditModal = (address) => {
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingAddress(null);
        setIsModalOpen(false);
    };

    const handleSubmitAddress = async (payload) => {
        if (editingAddress) {
            await updateAddressMutation.mutateAsync({
                addressId: editingAddress.id,
                payload,
            });
        } else {
            await createAddressMutation.mutateAsync(payload);
        }

        closeModal();
    };

    const handleDelete = async (address) => {
        const confirmed = window.confirm(translate('text.delete_this_address'));

        if (!confirmed) {
            return;
        }

        await deleteAddressMutation.mutateAsync(address.id);
    };

    return (
        <div className="space-y-6">
            <AccountNav />

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]"> {translate('text.manage_delivery_address')} </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]"> {translate('text.address_will_be_used_for_ordering_and_receiving_goods')} </p>
                        </div>
                        {!addressesQuery.isLoading && addresses.length > 0 && (
                            <Button onClick={openCreateModal}>
                                <Plus className="h-4 w-4" /> {translate('text.add_address')} </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    {addressesQuery.isLoading ? (
                        <Loading label={translate('text.loading_address')} />
                    ) : addresses.length === 0 ? (
                        <EmptyState
                            icon={MapPin}
                            title={translate('text.no_address_yet')}
                            description={translate('text.add_shipping_address_for_faster_checkout')}
                            actionLabel={translate('text.add_address')}
                            onAction={openCreateModal}
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {addresses.map((address) => (
                                <div
                                    key={address.id}
                                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-semibold text-[var(--color-text-main)]">
                                                    {address.receiver_name}
                                                </h2>
                                                {address.is_default && (
                                                    <Badge> {translate('text.default')} </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                                {address.phone}
                                            </p>
                                            <p className="mt-3 text-sm text-[var(--color-text-main)]">
                                                {formatAddress(address)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {!address.is_default && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                isLoading={
                                                    setDefaultAddressMutation.isPending
                                                }
                                                onClick={() =>
                                                    setDefaultAddressMutation.mutate(
                                                        address.id
                                                    )
                                                }
                                            >
                                                <Star className="h-4 w-4" /> {translate('text.default')} </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(address)}
                                        >
                                            <Edit3 className="h-4 w-4" /> {translate('text.edit_0963749f')} </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            isLoading={deleteAddressMutation.isPending}
                                            onClick={() => handleDelete(address)}
                                        >
                                            <Trash2 className="h-4 w-4" /> {translate('text.delete')} </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={isModalOpen}
                title={editingAddress ? translate('text.edit_address') : translate('text.add_address')}
                onClose={closeModal}
            >
                <AddressForm
                    key={editingAddress?.id || 'new-address'}
                    address={editingAddress}
                    isSaving={
                        createAddressMutation.isPending ||
                        updateAddressMutation.isPending
                    }
                    onSubmit={handleSubmitAddress}
                />
            </Modal>
        </div>
    );
}
