import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import Select from '../../../shared/components/Select';
import useDebounce from '../../../shared/hooks/useDebounce';

const sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'popular', label: 'Bán chạy' },
    { value: 'rating', label: 'Đánh giá cao' },
    { value: 'price_asc', label: 'Giá tăng dần' },
    { value: 'price_desc', label: 'Giá giảm dần' },
];

export default function ProductFilter({ filters, onChange, onReset }) {
    const [search, setSearch] = useState(filters.search || '');
    const debouncedSearch = useDebounce(search, 350);

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

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
                <SlidersHorizontal className="h-4 w-4 text-[var(--color-primary)]" />
                Bộ lọc sản phẩm
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_150px_150px_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tìm theo tên sản phẩm..."
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
                    placeholder="Giá từ"
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
                    placeholder="Giá đến"
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
                    <X className="h-4 w-4" />
                    Xóa lọc
                </Button>
            </div>
        </div>
    );
}
