import { translate } from '../../../shared/i18n/index';
import { Link } from 'react-router-dom';

import HomeBanner from '../../banners/components/HomeBanner';
import HomeDiscountsSection from '../../discounts/components/HomeDiscountsSection';
import HomeProductShowcase from '../components/HomeProductShowcase';
import { ROUTES } from '../../../shared/constants/routes';
import contactIcon from '../../../assets/images/contact-icon.png';
import paymentsIcon from '../../../assets/images/payments-icon.png';
import priceIcon from '../../../assets/images/price-icon.png';
import productsIcon from '../../../assets/images/products-icon.png';
import protectIcon from '../../../assets/images/protect-icon.png';
import reputationIcon from '../../../assets/images/reputation-icon.png';

const benefits = [
    {
        icon: protectIcon,
        title: translate('text.home_benefit_protect_title'),
        description: translate('text.home_benefit_protect_description'),
    },
    {
        icon: paymentsIcon,
        title: translate('text.home_benefit_payments_title'),
        description: translate('text.home_benefit_payments_description'),
    },
    {
        icon: reputationIcon,
        title: translate('text.home_benefit_reputation_title'),
        description: translate('text.home_benefit_reputation_description'),
    },
    {
        icon: productsIcon,
        title: translate('text.home_benefit_products_title'),
        description: translate('text.home_benefit_products_description'),
    },
    {
        icon: priceIcon,
        title: translate('text.home_benefit_price_title'),
        description: translate('text.home_benefit_price_description'),
    },
    {
        icon: contactIcon,
        title: translate('text.home_benefit_contact_title'),
        description: translate('text.home_benefit_contact_description'),
    },
];

export default function HomePage() {
    return (
        <div className="space-y-8">
            <section className="grid min-h-[360px] items-center gap-8 py-8 lg:grid-cols-[0.65fr_1.35fr] lg:pt-12 lg:pb-0">
                <div className="max-w-xl">
                    <h1 className="text-4xl font-bold leading-tight text-[var(--color-text-main)] md:text-5xl"> {translate('text.fruit_bags_are_clean_durable_and_convenient_for_gardeners')} </h1>

                    <p className="mt-5 text-base leading-7 text-[var(--color-text-muted)]"> {translate('text.providing_fruit_bags_drawstring_bags_and_materials_to_support_crop_prote')} </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to={ROUTES.PRODUCTS}
                            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                        > {translate('text.view_product')} </Link>

                        <Link
                            to={ROUTES.CART}
                            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-background)]"
                        > {translate('text.view_cart')} </Link>
                    </div>
                </div>

                <div className="w-full">
                    <HomeBanner location="homepage_top" />
                </div>
            </section>

            <section>
                <div className="mx-auto mb-5 max-w-3xl text-center md:mb-6">
                    <h2 className="text-[28px] font-bold text-[var(--color-text-main)] md:text-[34px]">
                        {translate('text.safety_reliability_responsibility')}
                    </h2>
                </div>
                <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    {benefits.map((item) => (
                        <div
                            key={item.title}
                            className="flex min-w-0 items-center gap-4 px-2 py-3"
                        >
                            <img
                                src={item.icon}
                                alt=""
                                aria-hidden="true"
                                className="h-16 w-16 shrink-0 object-contain"
                            />

                            <div className="min-w-0">
                                <h3 className="text-base font-bold leading-6 text-[var(--color-text-main)]">
                                    {item.title}
                                </h3>

                                <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <HomeDiscountsSection />

            <HomeProductShowcase />
        </div>
    );
}
