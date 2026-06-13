import { translate } from '../../../shared/i18n/index';
import { Link } from 'react-router-dom';
import PagePlaceholder from '../../../shared/components/PagePlaceholder';
import { ROUTES } from '../../../shared/constants/routes';

export default function NotFoundPage() {
    return (
        <PagePlaceholder
            title={translate('text.page')}
            description={translate('text.this_path_does_not_exist_or_has_been_changed')}
            action={
                <Link
                    to={ROUTES.HOME}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                > {translate('text.back_to_home_page')} </Link>
            }
        />
    );
}
