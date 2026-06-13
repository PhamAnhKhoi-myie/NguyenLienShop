import { translate } from '../../../shared/i18n/index';
import PagePlaceholder from '../../../shared/components/PagePlaceholder';

export default function AdminSectionPage({ title, description }) {
    return (
        <PagePlaceholder
            title={title}
            description={
                description ||
                translate('text.this_admin_area_will_be_hooked_up_to_apis_and_data_tables_in_later_stage')
            }
        />
    );
}
