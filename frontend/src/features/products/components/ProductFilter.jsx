import { translate } from '../../../shared/i18n/index';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../shared/components/Button';
import Select from '../../../shared/components/Select';
import useDebounce from '../../../shared/hooks/useDebounce';
import { useClickOutside } from '../../../shared/hooks/useClickOutside';
import { useCategoryTree } from '../../categories/hooks/useCategories';

const displayOptionGroups = [
    {
        label: translate('text.sort'),
        options: [
            { value: 'rating', label: translate('text.appreciate'), badge: null, sortBy: 'rating' },
            { value: 'price_asc', label: translate('text.price_increasing'), badge: null, sortBy: 'price_asc' },
            { value: 'price_desc', label: translate('text.price_decreasing'), badge: null, sortBy: 'price_desc' },
        ],
    },
    {
        label: translate('text.quick_filter'),
        options: [
            { value: 'best_seller', label: translate('text.best_seller'), badge: 'best_seller', sortBy: 'popular' },
            { value: 'in_stock', label: translate('text.in_stock'), badge: 'in_stock', sortBy: 'newest' },
            { value: 'new', label: translate('text.new_arrival'), badge: 'new', sortBy: 'newest' },
            { value: 'on_sale', label: translate('text.discounted'), badge: 'on_sale', sortBy: 'newest' },
        ],
    },
];

function flattenCategories(categories, level = 0) {
    return categories.flatMap((category) => [
        {
            value: category.id,
            label: `${'\u2014 '.repeat(level)}${category.name}`,
        },
        ...flattenCategories(category.children || [], level + 1),
    ]);
}

function CategoryDropdown({ value, options, isLoading, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selectedOption = options.find((option) => option.value === value);
    const displayLabel = isLoading
        ? translate('text.loading_categories')
        : selectedOption?.label || translate('text.all_categories');

    useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

    const handleSelect = (nextValue) => {
        onChange({
            category_id: nextValue || null,
            bag_type: null,
            page: 1,
        });
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                disabled={isLoading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-left text-sm text-[var(--color-text-main)] outline-none transition-colors focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:text-[var(--color-text-muted)]"
                onClick={() => setIsOpen((current) => !current)}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {isOpen && !isLoading && (
                <div
                    role="listbox"
                    className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-sm shadow-lg"
                >
                    <button
                        type="button"
                        role="option"
                        aria-selected={!value}
                        className={`block w-full px-3 py-2 text-left transition-colors hover:bg-[var(--color-background)] ${!value
                            ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]'
                            : 'text-[var(--color-text-main)]'
                            }`}
                        onClick={() => handleSelect('')}
                    >
                        {translate('text.all_categories')}
                    </button>

                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={value === option.value}
                            className={`block w-full px-3 py-2 text-left transition-colors hover:bg-[var(--color-background)] ${value === option.value
                                ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]'
                                : 'text-[var(--color-text-main)]'
                                }`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ProductFilter({ filters, onChange, onReset }) {
    const [search, setSearch] = useState(filters.search || '');
    const debouncedSearch = useDebounce(search, 350);
    const categoryTreeQuery = useCategoryTree();
    const categoryOptions = useMemo(
        () => flattenCategories(categoryTreeQuery.data?.data || []),
        [categoryTreeQuery.data?.data]
    );
    const displayOptions = useMemo(
        () => displayOptionGroups.flatMap((group) => group.options),
        []
    );
    const displayValue = filters.badge || (
        filters.sortBy === 'popular' ? 'best_seller' : filters.sortBy
    );
    const selectedDisplayValue = displayOptions.some(
        (option) => option.value === displayValue
    )
        ? displayValue
        : '';

    const handleDisplayChange = (event) => {
        const selectedOption = displayOptions.find(
            (option) => option.value === event.target.value
        );

        if (!selectedOption) {
            return;
        }

        onChange({
            badge: selectedOption.badge,
            sortBy: selectedOption.sortBy,
            page: 1,
        });
    };

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

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={translate('text.search_by_product_name')}
                        className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
                    />
                </div>

                <CategoryDropdown
                    value={filters.category_id}
                    options={categoryOptions}
                    isLoading={categoryTreeQuery.isLoading}
                    onChange={onChange}
                />

                <Select
                    value={selectedDisplayValue}
                    aria-label={`${translate('text.product_filter')} ${translate('text.sort')}`}
                    onChange={handleDisplayChange}
                >
                    <option value="" disabled>
                        {translate('text.product_filter')}
                    </option>
                    {displayOptionGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                            {group.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </Select>

                <Button
                    variant="outline"
                    className="md:col-span-2 xl:col-span-1"
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
