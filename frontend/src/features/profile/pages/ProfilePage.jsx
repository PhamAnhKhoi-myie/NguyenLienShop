import { LogOut, UserRound } from 'lucide-react';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card, { CardBody } from '../../../shared/components/Card';
import Loading from '../../../shared/components/Loading';
import { useLogout } from '../../auth/hooks/useLogout';
import { useMe } from '../../auth/hooks/useMe';
import { useAuthStore } from '../../auth/store/auth.store';

export default function ProfilePage() {
    const user = useAuthStore((state) => state.user);
    const meQuery = useMe();
    const logoutMutation = useLogout();
    const displayUser = meQuery.data?.data || user;
    const displayName =
        displayUser?.profile?.full_name ||
        displayUser?.full_name ||
        displayUser?.email ||
        'Tài khoản';

    if (meQuery.isLoading && !displayUser) {
        return <Loading label="Đang tải tài khoản..." />;
    }

    return (
        <Card>
            <CardBody>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-hover)]">
                            <UserRound className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                                {displayName}
                            </h1>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                {displayUser?.email}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(displayUser?.roles || []).map((role) => (
                                    <Badge key={role}>{role}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        isLoading={logoutMutation.isPending}
                        onClick={() => logoutMutation.mutate()}
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
