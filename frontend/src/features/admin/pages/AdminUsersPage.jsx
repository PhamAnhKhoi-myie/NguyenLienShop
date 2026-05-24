import { zodResolver } from '@hookform/resolvers/zod';
import {
    Eye,
    Filter,
    RefreshCw,
    Save,
    Search,
    Shield,
    Trash2,
    UserCog,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../../../shared/components/Button';
import Card, { CardBody, CardHeader } from '../../../shared/components/Card';
import EmptyState from '../../../shared/components/EmptyState';
import Input from '../../../shared/components/Input';
import Loading from '../../../shared/components/Loading';
import Modal from '../../../shared/components/Modal';
import Pagination from '../../../shared/components/Pagination';
import Select from '../../../shared/components/Select';
import { useAuthStore } from '../../auth/store/auth.store';
import AdminResourceForm from '../components/AdminResourceForm';
import {
    useAdminList,
    useAdminMutation,
} from '../hooks/useAdminResource';
import {
    userProfileFormConfig,
    userGenderOptions,
    userRoleOptions,
    userRolesSchema,
    userStatusFormConfig,
    userStatusOptions,
} from '../resources/adminUserForms';
import {
    formatDateTime,
    StatusBadge,
} from '../utils/adminFormat';

const actionTitles = {
    profile: 'Cập nhật hồ sơ',
    status: 'Cập nhật trạng thái',
    roles: 'Cập nhật vai trò',
};

const genderLabels = Object.fromEntries(
    userGenderOptions.map((option) => [option.value, option.label])
);

function getUserId(user) {
    return user?.id || user?._id;
}

function getRows(response) {
    return Array.isArray(response?.data) ? response.data : [];
}

function getPages(pagination = {}) {
    return pagination.total_pages || pagination.totalPages || pagination.pages || 1;
}

function formatGender(value) {
    return genderLabels[value] || genderLabels.UNSPECIFIED;
}

function getCurrentPage(pagination = {}, fallback) {
    return pagination.current_page || pagination.page || fallback;
}

function getTotalUsers(pagination = {}) {
    return pagination.total_items || pagination.total || 0;
}

function buildUserParams({ page, filters }) {
    const params = {
        page,
        limit: 20,
    };

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            params[key] = value;
        }
    });

    return params;
}

function DetailRow({ label, value, children }) {
    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">
                {label}
            </p>
            <div className="mt-1 break-words text-sm font-medium text-[var(--color-text-main)]">
                {children || value || '-'}
            </div>
        </div>
    );
}

function RoleBadges({ roles = [] }) {
    if (!roles.length) {
        return <span className="text-[var(--color-text-muted)]">-</span>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
                <StatusBadge key={role} value={role} label={role} />
            ))}
        </div>
    );
}

function StatsPanel({
    total,
    activeOnPage,
    suspendedOnPage,
    adminOnPage,
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-4">
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Tổng user
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {total}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Active trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-primary-hover)]">
                        {activeOnPage}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Suspended trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-warning)]">
                        {suspendedOnPage}
                    </p>
                </CardBody>
            </Card>
            <Card>
                <CardBody>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Admin trên trang
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-main)]">
                        {adminOnPage}
                    </p>
                </CardBody>
            </Card>
        </div>
    );
}

function UserFilters({
    values,
    onChange,
    onApply,
    onReset,
}) {
    return (
        <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:grid-cols-3">
            <Input
                label="Tìm kiếm"
                value={values.search}
                placeholder="Email hoặc tên..."
                onChange={(event) => onChange('search', event.target.value)}
            />
            <Select
                label="Trạng thái"
                value={values.status}
                onChange={(event) => onChange('status', event.target.value)}
            >
                {userStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>
            <div className="flex items-end gap-2">
                <Button type="button" onClick={onApply}>
                    <Filter className="h-4 w-4" />
                    Lọc
                </Button>
                <Button type="button" variant="outline" onClick={onReset}>
                    Xóa lọc
                </Button>
            </div>
        </div>
    );
}

function UserRolesForm({
    user,
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
        resolver: zodResolver(userRolesSchema),
        defaultValues: {
            roles: user?.roles?.length ? user.roles : ['CUSTOMER'],
        },
    });

    useEffect(() => {
        reset({
            roles: user?.roles?.length ? user.roles : ['CUSTOMER'],
        });
    }, [reset, user]);

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-3 md:grid-cols-2">
                {userRoleOptions.map((role) => (
                    <label
                        key={role.value}
                        className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm font-medium text-[var(--color-text-main)]"
                    >
                        <input
                            type="checkbox"
                            value={role.value}
                            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                            {...register('roles')}
                        />
                        {role.label}
                    </label>
                ))}
            </div>

            {errors.roles && (
                <p className="text-sm text-[var(--color-error)]">
                    {errors.roles.message}
                </p>
            )}

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
                    Lưu thay đổi
                </Button>
            </div>
        </form>
    );
}

function UserDetailPanel({
    user,
    isCurrentUser,
    onOpenAction,
    onDelete,
    isDeleting,
}) {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
                            {user.profile?.full_name || user.email}
                        </h2>
                        <StatusBadge value={user.status} />
                        {isCurrentUser && (
                            <StatusBadge value="verified" label="Tài khoản hiện tại" />
                        )}
                    </div>
                    <p className="mt-2 break-all text-sm text-[var(--color-text-muted)]">
                        {user.email}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAction('profile')}
                    >
                        <UserCog className="h-4 w-4" />
                        Hồ sơ
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isCurrentUser}
                        onClick={() => onOpenAction('roles')}
                    >
                        <Shield className="h-4 w-4" />
                        Vai trò
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isCurrentUser}
                        onClick={() => onOpenAction('status')}
                    >
                        <UserCog className="h-4 w-4" />
                        Trạng thái
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        disabled={isCurrentUser}
                        isLoading={isDeleting}
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                        Xóa mềm
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Hồ sơ
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow
                            label="Tên"
                            value={user.profile?.full_name}
                        />
                        <DetailRow
                            label="Điện thoại"
                            value={user.profile?.phone_number}
                        />
                        <DetailRow
                            label="Giới tính"
                            value={formatGender(user.profile?.gender)}
                        />
                        <DetailRow
                            label="Avatar"
                            value={user.profile?.avatar_url}
                        />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Quyền
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Roles">
                            <RoleBadges roles={user.roles || []} />
                        </DetailRow>
                        <DetailRow label="Tier" value={user.tier} />
                        <DetailRow label="Email verified">
                            {user.is_email_verified ? 'Có' : 'Không'}
                        </DetailRow>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <h3 className="font-semibold text-[var(--color-text-main)]">
                            Thời gian
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <DetailRow label="Tạo lúc">
                            {formatDateTime(user.created_at)}
                        </DetailRow>
                        <DetailRow label="Đăng nhập cuối">
                            {formatDateTime(user.last_login_at) || '-'}
                        </DetailRow>
                        <DetailRow label="Xác thực email">
                            {formatDateTime(user.email_verified_at) || '-'}
                        </DetailRow>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    const currentUser = useAuthStore((state) => state.user);
    const [page, setPage] = useState(1);
    const [draftFilters, setDraftFilters] = useState({
        search: '',
        status: '',
    });
    const [appliedFilters, setAppliedFilters] = useState(draftFilters);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionType, setActionType] = useState(null);
    const queryParams = useMemo(
        () => buildUserParams({ page, filters: appliedFilters }),
        [appliedFilters, page]
    );
    const usersQuery = useAdminList('/users', queryParams);
    const profileMutation = useAdminMutation({ method: 'patch' });
    const rolesMutation = useAdminMutation({ method: 'patch' });
    const statusMutation = useAdminMutation({ method: 'patch' });
    const deleteMutation = useAdminMutation({ method: 'delete' });
    const users = getRows(usersQuery.data);
    const pagination = usersQuery.data?.pagination || {};
    const totalPages = getPages(pagination);
    const totalUsers = getTotalUsers(pagination);
    const selectedUserId = getUserId(selectedUser);
    const currentUserId = currentUser?.id || currentUser?._id;
    const isCurrentUser =
        selectedUserId && currentUserId && selectedUserId === currentUserId;
    const activeOnPage = users.filter((user) => user.status === 'ACTIVE').length;
    const suspendedOnPage = users.filter(
        (user) => user.status === 'SUSPENDED'
    ).length;
    const adminOnPage = users.filter((user) =>
        (user.roles || []).includes('ADMIN')
    ).length;
    const actionForm =
        actionType === 'profile'
            ? userProfileFormConfig
            : actionType === 'status'
              ? userStatusFormConfig
              : null;
    const actionMutation =
        actionType === 'profile'
            ? profileMutation
            : actionType === 'status'
              ? statusMutation
              : rolesMutation;

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
        const nextFilters = {
            search: '',
            status: '',
        };

        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        setPage(1);
    };

    const refreshUsers = async () => {
        await usersQuery.refetch();
    };

    const resetActionMutations = () => {
        profileMutation.reset();
        rolesMutation.reset();
        statusMutation.reset();
    };

    const openDetail = (user) => {
        setSelectedUser(user);
        setActionType(null);
    };

    const closeDetail = () => {
        setSelectedUser(null);
        setActionType(null);
        deleteMutation.reset();
    };

    const openAction = (type) => {
        if (isCurrentUser && ['roles', 'status'].includes(type)) {
            return;
        }

        resetActionMutations();
        setActionType(type);
    };

    const closeAction = () => {
        setActionType(null);
    };

    const handleSubmitAction = async (values) => {
        if (!selectedUser) {
            return;
        }

        if (actionType === 'profile') {
            const response = await profileMutation.mutateAsync({
                endpoint: `/users/${selectedUserId}`,
                payload: userProfileFormConfig.toPayload(values),
            });
            setSelectedUser(response.data);
        }

        if (actionType === 'status' && !isCurrentUser) {
            const response = await statusMutation.mutateAsync({
                endpoint: `/users/${selectedUserId}/status`,
                payload: userStatusFormConfig.toPayload(values),
            });
            setSelectedUser(response.data);
        }

        closeAction();
        await refreshUsers();
    };

    const handleSubmitRoles = async (values) => {
        if (!selectedUser || isCurrentUser) {
            return;
        }

        const response = await rolesMutation.mutateAsync({
            endpoint: `/users/${selectedUserId}/roles`,
            payload: {
                roles: values.roles,
            },
        });
        setSelectedUser(response.data);
        closeAction();
        await refreshUsers();
    };

    const handleDelete = async () => {
        if (!selectedUser || isCurrentUser) {
            return;
        }

        const confirmed = window.confirm(`Xóa mềm user ${selectedUser.email}?`);

        if (!confirmed) {
            return;
        }

        await deleteMutation.mutateAsync({
            endpoint: `/users/${selectedUserId}`,
        });
        closeDetail();
        await refreshUsers();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-primary-hover)]">
                        Admin
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">
                        Quản lý người dùng
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        ADMIN quản lý hồ sơ, trạng thái tài khoản và vai trò hệ thống.
                    </p>
                </div>
                <Button
                    variant="outline"
                    isLoading={usersQuery.isFetching}
                    onClick={refreshUsers}
                >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại
                </Button>
            </div>

            <StatsPanel
                total={totalUsers}
                activeOnPage={activeOnPage}
                suspendedOnPage={suspendedOnPage}
                adminOnPage={adminOnPage}
            />

            <Card>
                <CardHeader>
                    <UserFilters
                        values={draftFilters}
                        onChange={handleFilterChange}
                        onApply={handleApplyFilters}
                        onReset={handleResetFilters}
                    />
                </CardHeader>
                <CardBody>
                    {usersQuery.isLoading ? (
                        <Loading label="Đang tải người dùng..." />
                    ) : usersQuery.isError ? (
                        <EmptyState
                            icon={Search}
                            title="Không tải được người dùng"
                            description={usersQuery.error.message}
                        />
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Chưa có người dùng"
                            description="User đăng ký hoặc seed sẽ hiển thị tại đây."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-background)] text-left text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Roles</th>
                                            <th className="px-4 py-3">Tier</th>
                                            <th className="px-4 py-3">Trạng thái</th>
                                            <th className="px-4 py-3">Đăng nhập cuối</th>
                                            <th className="px-4 py-3 text-right">Tác vụ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                                        {users.map((user) => (
                                            <tr key={getUserId(user)}>
                                                <td className="px-4 py-3 font-medium text-[var(--color-text-main)]">
                                                    {user.profile?.full_name || '-'}
                                                </td>
                                                <td className="max-w-64 break-all px-4 py-3 text-[var(--color-text-main)]">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <RoleBadges roles={user.roles || []} />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {user.tier || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge value={user.status} />
                                                </td>
                                                <td className="px-4 py-3 text-[var(--color-text-main)]">
                                                    {formatDateTime(user.last_login_at) || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDetail(user)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Chi tiết
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                page={getCurrentPage(pagination, page)}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={Boolean(selectedUser)}
                title={selectedUser?.email || 'Chi tiết người dùng'}
                onClose={closeDetail}
                panelClassName="max-w-6xl"
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <UserDetailPanel
                            user={selectedUser}
                            isCurrentUser={Boolean(isCurrentUser)}
                            isDeleting={deleteMutation.isPending}
                            onOpenAction={openAction}
                            onDelete={handleDelete}
                        />

                        {deleteMutation.isError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--color-error)]">
                                {deleteMutation.error.message}
                            </p>
                        )}
                    </div>
                )}
            </Modal>

            {actionForm && (
                <Modal
                    open={Boolean(actionType)}
                    title={actionTitles[actionType]}
                    onClose={closeAction}
                    panelClassName="max-w-3xl"
                >
                    <AdminResourceForm
                        form={actionForm}
                        mode="edit"
                        initialData={selectedUser}
                        optionData={{}}
                        isLoading={actionMutation.isPending}
                        error={actionMutation.error}
                        onCancel={closeAction}
                        onSubmit={handleSubmitAction}
                    />
                </Modal>
            )}

            {actionType === 'roles' && (
                <Modal
                    open={actionType === 'roles'}
                    title={actionTitles.roles}
                    onClose={closeAction}
                    panelClassName="max-w-2xl"
                >
                    <UserRolesForm
                        user={selectedUser}
                        isLoading={rolesMutation.isPending}
                        error={rolesMutation.error}
                        onCancel={closeAction}
                        onSubmit={handleSubmitRoles}
                    />
                </Modal>
            )}
        </div>
    );
}
