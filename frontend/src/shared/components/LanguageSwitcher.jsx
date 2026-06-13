import {
    getLanguage,
    setLanguage,
    translate,
} from '../i18n';

export default function LanguageSwitcher() {
    return (
        <select
            aria-label={translate('language.label')}
            value={getLanguage()}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)]"
        >
            <option value="en">{translate('language.english')}</option>
            <option value="vi">{translate('language.vietnamese')}</option>
        </select>
    );
}
