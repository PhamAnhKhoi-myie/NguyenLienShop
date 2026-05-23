import PagePlaceholder from '../../../shared/components/PagePlaceholder';

export default function AdminSectionPage({ title, description }) {
    return (
        <PagePlaceholder
            title={title}
            description={
                description ||
                'Khu vực quản trị này sẽ được nối API và bảng dữ liệu ở các giai đoạn sau.'
            }
        />
    );
}
