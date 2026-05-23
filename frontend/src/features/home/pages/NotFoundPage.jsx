import { Link } from 'react-router-dom';
import PagePlaceholder from '../../../shared/components/PagePlaceholder';
import { ROUTES } from '../../../shared/constants/routes';

export default function NotFoundPage() {
    return (
        <PagePlaceholder
            title="Không tìm thấy trang"
            description="Đường dẫn này không tồn tại hoặc đã được thay đổi."
            action={
                <Link
                    to={ROUTES.HOME}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    Về trang chủ
                </Link>
            }
        />
    );
}
