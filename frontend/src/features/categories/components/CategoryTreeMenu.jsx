import { ChevronRight, Leaf } from 'lucide-react';
import EmptyState from '../../../shared/components/EmptyState';
import Loading from '../../../shared/components/Loading';
import { cn } from '../../../shared/utils/cn';
import { useCategoryTree } from '../hooks/useCategories';

const levelPadding = ['pl-3', 'pl-7', 'pl-11', 'pl-14', 'pl-16'];

function CategoryNode({ category, selectedId, onSelect, level = 0 }) {
    const isSelected = selectedId === category.id;
    const children = category.children || [];
    const paddingClass = levelPadding[Math.min(level, levelPadding.length - 1)];

    return (
        <div>
            <button
                type="button"
                className={cn(
                    'flex w-full items-center justify-between rounded-md py-2 pr-3 text-left text-sm transition-colors',
                    paddingClass,
                    isSelected
                        ? 'bg-[var(--color-secondary)] font-medium text-[var(--color-primary-hover)]'
                        : 'text-[var(--color-text-main)] hover:bg-[var(--color-background)]'
                )}
                onClick={() => onSelect(category.id)}
            >
                <span className="line-clamp-1">{category.name}</span>
                {children.length > 0 && (
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
            </button>

            {children.map((child) => (
                <CategoryNode
                    key={child.id}
                    category={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    level={level + 1}
                />
            ))}
        </div>
    );
}

export default function CategoryTreeMenu({ selectedId, onSelect }) {
    const categoryTreeQuery = useCategoryTree();
    const categories = categoryTreeQuery.data?.data || [];

    if (categoryTreeQuery.isLoading) {
        return <Loading label="Đang tải danh mục..." />;
    }

    if (categoryTreeQuery.isError) {
        return (
            <p className="text-sm text-[var(--color-error)]">
                {categoryTreeQuery.error.message}
            </p>
        );
    }

    if (categories.length === 0) {
        return (
            <EmptyState
                icon={Leaf}
                title="Chưa có danh mục"
                description="Danh mục sản phẩm sẽ hiển thị tại đây."
            />
        );
    }

    return (
        <div className="space-y-1">
            <button
                type="button"
                className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    !selectedId
                        ? 'bg-[var(--color-secondary)] font-medium text-[var(--color-primary-hover)]'
                        : 'text-[var(--color-text-main)] hover:bg-[var(--color-background)]'
                )}
                onClick={() => onSelect(null)}
            >
                Tất cả sản phẩm
            </button>

            {categories.map((category) => (
                <CategoryNode
                    key={category.id}
                    category={category}
                    selectedId={selectedId}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}
