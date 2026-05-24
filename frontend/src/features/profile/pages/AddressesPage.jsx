import { zodResolver } from '@hookform/resolvers/zod';
import { Edit3, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import AccountNav from '../components/AccountNav';
import {
    useAccountAddresses,
    useCreateAccountAddress,
    useDeleteAccountAddress,
    useSetDefaultAccountAddress,
    useUpdateAccountAddress,
} from '../hooks/useProfile';

const addressSchema = z.object({
    receiver_name: z.string().trim().min(1, 'Vui lòng nhập người nhận'),
    phone: z
        .string()
        .trim()
        .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
    address_line_1: z.string().trim().min(1, 'Vui lòng nhập địa chỉ'),
    address_line_2: z.string().trim().optional(),
    ward: z.string().trim().min(1, 'Vui lòng nhập phường/xã'),
    district: z.string().trim().min(1, 'Vui lòng nhập quận/huyện'),
    city: z.string().trim().min(1, 'Vui lòng nhập tỉnh/thành'),
    is_default: z.boolean().default(false),
});

const emptyAddress = {
    receiver_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    ward: '',
    district: '',
    city: '',
    is_default: false,
};

function toFormValues(address) {
    if (!address) {
        return emptyAddress;
    }

    return {
        receiver_name: address.receiver_name || '',
        phone: address.phone || '',
        address_line_1: address.address_line_1 || '',
        address_line_2: address.address_line_2 || '',
        ward: address.ward || '',
        district: address.district || '',
        city: address.city || '',
        is_default: Boolean(address.is_default),
    };
}

function formatAddress(address) {
    return [
        address.address_line_1,
        address.address_line_2,
        address.ward,
        address.district,
        address.city,
    ]
        .filter(Boolean)
        .join(', ');
}

function AddressForm({ address, isSaving, onSubmit }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(addressSchema),
        defaultValues: toFormValues(address),
    });

    const submit = (values) => {
        onSubmit({
            receiver_name: values.receiver_name.trim(),
            phone: values.phone.trim(),
            address_line_1: values.address_line_1.trim(),
            address_line_2: values.address_line_2?.trim() || undefined,
            ward: values.ward.trim(),
            district: values.district.trim(),
            city: values.city.trim(),
            is_default: Boolean(values.is_default),
        });
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Người nhận"
                    error={errors.receiver_name?.message}
                    {...register('receiver_name')}
                />
                <Input
                    label="Số điện thoại"
                    placeholder="0901234567"
                    error={errors.phone?.message}
                    {...register('phone')}
                />
            </div>

            <Input
                label="Địa chỉ"
                placeholder="Số nhà, tên đường"
                error={errors.address_line_1?.message}
                {...register('address_line_1')}
            />

            <Input
                label="Địa chỉ bổ sung"
                placeholder="Tên vườn, ấp, khu vực giao hàng"
                error={errors.address_line_2?.message}
                {...register('address_line_2')}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Input
                    label="Phường/xã"
                    error={errors.ward?.message}
                    {...register('ward')}
                />
                <Input
                    label="Quận/huyện"
                    error={errors.district?.message}
                    {...register('district')}
                />
                <Input
                    label="Tỉnh/thành"
                    error={errors.city?.message}
                    {...register('city')}
                />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    {...register('is_default')}
                />
                Đặt làm địa chỉ mặc định
            </label>

            <Button type="submit" isLoading={isSaving}>
                {address ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ'}
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
        const confirmed = window.confirm('Xóa địa chỉ này?');

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
                            <h1 className="text-xl font-semibold text-[var(--color-text-main)]">
                                Quản lý địa chỉ giao hàng
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Địa chỉ sẽ được dùng để đặt hàng - nhận hàng.
                            </p>
                        </div>
                        {!addressesQuery.isLoading && addresses.length > 0 && (
                            <Button onClick={openCreateModal}>
                                <Plus className="h-4 w-4" />
                                Thêm địa chỉ
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    {addressesQuery.isLoading ? (
                        <Loading label="Đang tải địa chỉ..." />
                    ) : addresses.length === 0 ? (
                        <EmptyState
                            icon={MapPin}
                            title="Chưa có địa chỉ"
                            description="Thêm địa chỉ giao hàng để checkout nhanh hơn."
                            actionLabel="Thêm địa chỉ"
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
                                                    <Badge> Mặc định </Badge>
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
                                                <Star className="h-4 w-4" />
                                                Mặc định
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(address)}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            isLoading={deleteAddressMutation.isPending}
                                            onClick={() => handleDelete(address)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={isModalOpen}
                title={editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}
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
