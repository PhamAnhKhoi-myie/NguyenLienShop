import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';

import { useBanners } from '../hooks/useBanners';

const BANNER_INTERVAL = 7000;

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

    const [currentIndex, setCurrentIndex] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(true);

    const hasManyBanners = banners.length > 1;
    const currentBanner = banners[0];

    const sliderBanners = useMemo(() => {
        if (!hasManyBanners) return banners;

        return [banners[banners.length - 1], ...banners, banners[0]];
    }, [banners, hasManyBanners]);

    const maxIndex = Math.max(sliderBanners.length - 1, 0);

    const displayIndex = hasManyBanners
        ? Math.min(Math.max(currentIndex, 0), maxIndex)
        : 0;

    useEffect(() => {
        if (!hasManyBanners) return;

        const timer = setInterval(() => {
            setIsTransitioning(true);
            setCurrentIndex((prevIndex) => prevIndex + 1);
        }, BANNER_INTERVAL);

        return () => clearInterval(timer);
    }, [hasManyBanners]);

    const handleTransitionEnd = () => {
        if (!hasManyBanners) return;

        if (currentIndex === sliderBanners.length - 1) {
            setIsTransitioning(false);
            setCurrentIndex(1);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsTransitioning(true);
                });
            });

            return;
        }

        if (currentIndex === 0) {
            setIsTransitioning(false);
            setCurrentIndex(banners.length);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsTransitioning(true);
                });
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:min-h-[280px] md:min-h-[340px] lg:min-h-[360px]">
                <p className="text-sm text-[var(--color-text-muted)]">
                    Đang tải banner...
                </p>
            </div>
        );
    }

    if (!currentBanner) {
        return (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] sm:min-h-[280px] md:min-h-[340px] lg:min-h-[360px]">
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
        <div className="relative h-[240px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:h-[280px] md:h-[340px] lg:h-[360px]">
            <div
                className={`flex h-full ${isTransitioning
                    ? 'transition-transform duration-[1200ms] ease-in-out'
                    : ''
                    }`}
                style={{
                    transform: `translateX(-${displayIndex * 100}%)`,
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {sliderBanners.map((banner, index) => (
                    <div
                        key={`${banner.id || banner._id || banner.image?.url}-${index}`}
                        className="h-full w-full flex-shrink-0"
                    >
                        <BannerLink banner={banner}>
                            <img
                                src={banner.image?.url}
                                alt={banner.image?.alt_text || 'Banner'}
                                draggable={false}
                                className="h-full w-full select-none object-cover"
                            />
                        </BannerLink>
                    </div>
                ))}
            </div>
        </div>
    );
}