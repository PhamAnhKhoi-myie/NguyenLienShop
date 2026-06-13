import { translate } from '../../../shared/i18n/index';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import useDebounce from '../../../shared/hooks/useDebounce';

const sortOptions = [
    { value: 'newest', label: translate('text.latest') },
    { value: 'popular', label: translate('text.best_seller') },
    { value: 'rating', label: translate('text.appreciate') },
    { value: 'price_asc', label: translate('text.price_increasing') },
    { value: 'price_desc', label: translate('text.price_decreasing') },
];

export default function ProductFilter({ filters, onChange, onReset }) {
    const [search, setSearch] = useState(filters.search || '');
    const debouncedSearch = useDebounce(search, 350);

    useEffect(() => {
        const nextSearch = debouncedSearch || null;
        const currentSearch = filters.search || null;

        if (nextSearch !== currentSearch) {
            onChange({
                search: nextSearch,
                page: 1,
            });
        }
    }, [debouncedSearch, filters.search, onChange]);

    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" /> {translate('text.product_filter')} </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_150px_150px_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={translate('text.search_by_product_name')}
                        className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
                    />
                </div>

                <Select
                    value={filters.sortBy}
                    onChange={(event) =>
                        onChange({ sortBy: event.target.value, page: 1 })
                    }
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>

                <Input
                    type="number"
                    min="0"
                    placeholder={translate('text.price_from')}
                    value={filters.min_price || ''}
                    onChange={(event) =>
                        onChange({
                            min_price: event.target.value || null,
                            page: 1,
                        })
                    }
                />

                <Input
                    type="number"
                    min="0"
                    placeholder={translate('text.price_to')}
                    value={filters.max_price || ''}
                    onChange={(event) =>
                        onChange({
                            max_price: event.target.value || null,
                            page: 1,
                        })
                    }
                />

                <Button
                    variant="outline"
                    onClick={() => {
                        setSearch('');
                        onReset();
                    }}
                >
                    <X className="h-4 w-4" /> {translate('text.clear_filter')} </Button>
            </div>
        </div>
    );
}
