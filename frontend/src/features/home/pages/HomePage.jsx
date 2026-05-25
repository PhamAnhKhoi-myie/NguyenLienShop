import { Link } from 'react-router-dom';
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react';

import Card, { CardBody } from '../../../shared/components/Card';
import HomeBanner from '../../banners/components/HomeBanner';
import HomeDiscountsSection from '../../discounts/components/HomeDiscountsSection';
import { ROUTES } from '../../../shared/constants/routes';

const benefits = [
    {
        icon: ShieldCheck,
        title: 'Bảo vệ trái cây',
        description: 'Hạn chế sâu bệnh, côn trùng và tác động từ nắng mưa.',
    },
    {
        icon: PackageCheck,
        title: 'Dễ chọn đúng loại',
        description: 'Thông tin rõ về kích thước, chất liệu, số lượng/gói và công dụng.',
    },
    {
        icon: Truck,
        title: 'Phù hợp mua lẻ và nhà vườn',
        description: 'Dễ đặt hàng, phù hợp cho khách cá nhân, vườn nhỏ và đại lý.',
    },
];

const categories = [
    {
        title: 'Túi bao bưởi',
        description: 'Dành cho trái lớn, cần túi bền, thoáng và dễ rút miệng.',
    },
    {
        title: 'Túi bao xoài',
        description: 'Hỗ trợ hạn chế ruồi vàng, sâu bệnh và nám vỏ trái.',
    },
    {
        title: 'Túi bao ổi',
        description: 'Dễ sử dụng, phù hợp cho vườn nhỏ và nhu cầu mua số lượng vừa.',
    },
];

export default function HomePage() {
    return (
        <div className="space-y-16">
            <section className="grid min-h-[360px] items-center gap-8 py-8 lg:grid-cols-[0.65fr_1.35fr] lg:py-12">
                <div className="max-w-xl">
                    <h1 className="text-4xl font-bold leading-tight text-[var(--color-text-main)] md:text-5xl">
                        Túi bao trái cây sạch, bền và tiện cho nhà vườn
                    </h1>

                    <p className="mt-5 text-base leading-7 text-[var(--color-text-muted)]">
                        Cung cấp túi bao trái cây, túi vải rút và vật tư hỗ trợ
                        bảo vệ cây trồng. Sản phẩm phù hợp cho vườn bưởi, xoài,
                        ổi và nhiều loại cây ăn trái khác.
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to={ROUTES.PRODUCTS}
                            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                        >
                            Xem sản phẩm
                        </Link>

                        <Link
                            to={ROUTES.CART}
                            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                        >
                            Xem giỏ hàng
                        </Link>
                    </div>
                </div>

                <div className="w-full">
                    <HomeBanner location="homepage_top" />
                </div>
            </section>

            <section>
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-2xl font-bold text-[var(--color-text-main)] md:text-3xl">
                        Chọn đúng túi bao cho từng loại trái cây
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                        Website giúp khách xem sản phẩm, chọn biến thể, chọn đơn vị
                        bán, thêm vào giỏ hàng và đặt hàng nhanh hơn. Thông tin sản
                        phẩm được trình bày theo kích thước, số lượng/gói, chất liệu,
                        công dụng và giá bán.
                    </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    {benefits.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div key={item.title} className="text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[var(--color-primary)]">
                                    <Icon size={24} />
                                </div>

                                <h3 className="mt-4 text-base font-semibold text-[var(--color-text-main)]">
                                    {item.title}
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                                    {item.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <HomeDiscountsSection />

            <section>
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
                            Sản phẩm theo nhu cầu nhà vườn
                        </h2>

                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                            Có thể dùng cho danh mục nổi bật, sản phẩm bán chạy hoặc
                            sản phẩm đang giảm giá.
                        </p>
                    </div>

                    <Link
                        to={ROUTES.PRODUCTS}
                        className="text-sm font-semibold text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                    >
                        Xem tất cả sản phẩm
                    </Link>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    {categories.map((item) => (
                        <Card key={item.title}>
                            <CardBody className="p-6">
                                <h3 className="text-lg font-semibold text-[var(--color-text-main)]">
                                    {item.title}
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                                    {item.description}
                                </p>

                                <Link
                                    to={ROUTES.PRODUCTS}
                                    className="mt-4 inline-flex text-sm font-semibold text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                                >
                                    Xem sản phẩm
                                </Link>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="pb-8 text-center">
                <h2 className="text-2xl font-bold text-[var(--color-text-main)]">
                    Cần chọn túi bao phù hợp?
                </h2>

                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                    Xem danh sách sản phẩm để chọn đúng kích thước, chất liệu,
                    số lượng/gói và mức giá phù hợp với vườn của bạn.
                </p>

                <Link
                    to={ROUTES.PRODUCTS}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                    Đi tới sản phẩm
                </Link>
            </section>
        </div>
    );
}
