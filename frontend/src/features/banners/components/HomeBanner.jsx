import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';

import { useBanners } from '../hooks/useBanners';

function isExternalLink(link) {
    return /^https?:\/\//i.test(link);
}

function BannerLink({ banner, children }) {
    const link = banner?.link || '';

    if (!link) {
        return children;
    }

    if (isExternalLink(link)) {
        return (
            <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="block h-full w-full"
            >
                {children}
            </a>
        );
    }

    if (link.startsWith('/')) {
        return (
            <Link to={link} className="block h-full w-full">
                {children}
            </Link>
        );
    }

    return (
        <Link to={`/products/${link}`} className="block h-full w-full">
            {children}
        </Link>
    );
}

export default function HomeBanner({ location = 'homepage_top' }) {
    const { data: banners = [], isLoading } = useBanners(location);
    const banner = banners[0];

    if (isLoading) {
        return (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <p className="text-sm text-[var(--color-text-muted)]">
                    Đang tải banner...
                </p>
            </div>
        );
    }

    if (!banner) {
        return (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
                        <ImageOff className="h-6 w-6" />
                    </div>

                    <p className="mt-5 text-base font-semibold text-[var(--color-text-main)]">
                        Chưa có banner
                    </p>

                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--color-text-muted)]">
                        Tạo banner vị trí {location} trong trang quản trị.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[280px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <BannerLink banner={banner}>
                <img
                    src={banner.image?.url}
                    alt={banner.image?.alt_text || 'Banner'}
                    className="h-[280px] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
            </BannerLink>
        </div>
    );
}