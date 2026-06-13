import { translate } from '../../../shared/i18n/index';
import { Link } from 'react-router-dom';
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react';

import Card, { CardBody } from '../../../shared/components/Card';
import HomeBanner from '../../banners/components/HomeBanner';
import HomeDiscountsSection from '../../discounts/components/HomeDiscountsSection';
import { ROUTES } from '../../../shared/constants/routes';

const benefits = [
    {
        icon: ShieldCheck,
        title: translate('text.protect_fruit'),
        description: translate('text.limit_pests_insects_and_impacts_from_sun_and_rain'),
    },
    {
        icon: PackageCheck,
        title: translate('text.easy_to_choose_the_right_type'),
        description: translate('text.clear_information_about_size_material_quantity_package_and_use'),
    },
    {
        icon: Truck,
        title: translate('text.suitable_for_retail_and_garden_use'),
        description: translate('text.easy_to_order_suitable_for_individual_customers_small_gardens_and_agents'),
    },
];

const categories = [
    {
        title: translate('text.grapefruit_bag'),
        description: translate('text.for_large_fruit_need_a_bag_that_is_durable_airy_and_easy_to_retract'),
    },
    {
        title: translate('text.mango_bag'),
        description: translate('text.helps_limit_yellow_flies_pests_and_melasma_on_fruit_skin'),
    },
    {
        title: translate('text.guava_bag'),
        description: translate('text.easy_to_use_suitable_for_small_gardens_and_medium_quantity_purchases'),
    },
];

export default function HomePage() {
    return (
        <div className="space-y-16">
            <section className="grid min-h-[360px] items-center gap-8 py-8 lg:grid-cols-[0.65fr_1.35fr] lg:py-12">
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
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-2xl font-bold text-[var(--color-text-main)] md:text-3xl"> {translate('text.choose_the_correct_bag_for_each_type_of_fruit')} </h2>

                    <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]"> {translate('text.website_helps_customers_view_products_choose_variations_choose_sellers_a')} </p>
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
                        <h2 className="text-2xl font-bold text-[var(--color-text-main)]"> {translate('text.products_according_to_gardener_s_needs')} </h2>

                        <p className="mt-2 text-sm text-[var(--color-text-muted)]"> {translate('text.can_be_used_for_featured_categories_best_selling_products_or_discounted_')} </p>
                    </div>

                    <Link
                        to={ROUTES.PRODUCTS}
                        className="text-sm font-semibold text-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                    > {translate('text.view_all_products')} </Link>
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
                                > {translate('text.view_product')} </Link>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="pb-8 text-center">
                <h2 className="text-2xl font-bold text-[var(--color-text-main)]"> {translate('text.need_to_choose_the_right_bag')} </h2>

                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]"> {translate('text.view_product_listings_to_choose_the_right_size_material_quantity_package')} </p>

                <Link
                    to={ROUTES.PRODUCTS}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                > {translate('text.go_to_product')} </Link>
            </section>
        </div>
    );
}
