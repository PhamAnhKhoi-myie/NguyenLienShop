import AdminResourcePage from '../components/AdminResourcePage';
import { adminResources } from '../resources/adminResources';

export default function AdminConfiguredPage({ resourceKey }) {
    return <AdminResourcePage resource={adminResources[resourceKey]} />;
}
