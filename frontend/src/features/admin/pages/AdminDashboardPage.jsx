import Card, { CardBody } from '../../../shared/components/Card';

export default function AdminDashboardPage() {
    return (
        <Card>
            <CardBody>
                <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                    Admin Dashboard
                </h1>
                <p className="mt-2 text-[var(--color-text-muted)]">
                    Khu vực quản trị sẽ được chia theo quyền ADMIN và MANAGER.
                </p>
            </CardBody>
        </Card>
    );
}
