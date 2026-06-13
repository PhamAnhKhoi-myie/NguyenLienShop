import { translate } from '../shared/i18n/index';
import {
    BadgeDollarSign,
    Camera,
    Clock3,
    CreditCard,
    Globe2,
    Mail,
    MapPin,
    MessageCircle,
    Music,
    Phone,
    ShoppingBag,
    Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import registeredTradeLogo from '../assets/images/logo-da-dang-ky-bo-cong-thuong-mau-do.png';
import notifiedTradeLogo from '../assets/images/logo-da-thong-bao-bo-cong-thuong-mau-xanh.png';
import logo from '../assets/images/logo.png';
import { useShopInfo } from '../features/shopInfo/hooks/useShopInfo';
import { ROUTES } from '../shared/constants/routes';

const infoLinks = [
    { label: translate('text.shipping_policy'), href: '#' },
    { label: translate('text.return_policy'), href: '#' },
    { label: translate('text.ordering_regulations'), href: '#' },
    { label: translate('text.warranty'), href: '#' },
    { label: translate('text.faq'), href: '#' },
    { label: translate('text.contact'), href: '#' },
];

const paymentMethods = [
    {
        label: translate('text.cod'),
        icon: BadgeDollarSign,
        color: '#007A3D',
        background: '#EAF8F0',
        border: '#9EDBB9',
    },
    {
        label: translate('text.vnpay_a219ad16'),
        icon: CreditCard,
        color: '#005BAA',
        background: 'linear-gradient(135deg, #EEF7FF 0%, #FFF1F1 100%)',
        border: '#A9D2F5',
    },
    {
        label: translate('text.payos'),
        icon: CreditCard,
        color: '#0A7C66',
        background: 'linear-gradient(135deg, #E9FBF6 0%, #F1FFF9 100%)',
        border: '#8FDAC7',
    },
    {
        label: translate('text.momo'),
        icon: Wallet,
        color: '#A50064',
        background: '#FDECF7',
        border: '#F3B5DC',
    },
    {
        label: translate('text.paypal'),
        icon: Wallet,
        color: '#003087',
        background: 'linear-gradient(135deg, #EAF4FF 0%, #F5FAFF 100%)',
        border: '#8EC5F4',
    },
];

const socialLinks = [
    {
        key: 'facebook',
        label: translate('text.facebook'),
        href: '#',
        icon: Globe2,
        color: '#1877F2',
        background: '#EEF5FF',
        border: '#BCD7FF',
        iconBackground: '#1877F2',
        iconColor: '#FFFFFF',
    },
    {
        key: 'zalo',
        label: translate('text.zalo'),
        href: '#',
        icon: MessageCircle,
        color: '#0068FF',
        background: '#EEF5FF',
        border: '#B8D3FF',
        iconBackground: '#0068FF',
        iconColor: '#FFFFFF',
    },
    {
        key: 'instagram',
        label: translate('text.instagram'),
        href: '#',
        icon: Camera,
        color: '#C13584',
        background: 'linear-gradient(135deg, #FFF5DC 0%, #FFE7EF 48%, #F2E9FF 100%)',
        border: '#F4B8D2',
        iconBackground: 'linear-gradient(135deg, #FCAF45 0%, #E1306C 52%, #833AB4 100%)',
        iconColor: '#FFFFFF',
    },
    {
        key: 'tiktok',
        label: translate('text.tiktok'),
        href: '#',
        icon: Music,
        color: '#111111',
        background: 'linear-gradient(135deg, #F1FFFF 0%, #FFF2F5 100%)',
        border: '#D6E8EA',
        iconBackground: '#111111',
        iconColor: '#25F4EE',
        iconShadow: '2px 0 0 #FE2C55',
    },
    {
        key: 'shoppe',
        label: translate('text.shopee'),
        href: '#',
        icon: ShoppingBag,
        color: '#EE4D2D',
        background: '#FFF1EC',
        border: '#FFD0C2',
        iconBackground: '#EE4D2D',
        iconColor: '#FFFFFF',
    },
];

const dayLabels = {
    mon: translate('text.monday'),
    tue: translate('text.tuesday'),
    wed: translate('text.wednesday'),
    thu: translate('text.thursday'),
    fri: translate('text.friday'),
    sat: translate('text.saturday'),
    sun: translate('text.sunday'),
    holiday: translate('text.holiday'),
};

function FooterTitle({ children }) {
    return (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary-hover)]">
            {children}
        </h2>
    );
}

function ContactLine({ icon: Icon, children }) {
    return (
        <li className="flex items-start gap-2 text-sm leading-6 text-[var(--color-text-main)]">
            <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <span>{children}</span>
        </li>
    );
}

function hasRealHref(href) {
    return href && href !== '#';
}

function formatWorkingHour(hour) {
    return `${dayLabels[hour.day] || hour.day}: ${hour.open} - ${hour.close}`;
}

function CertificateLogo({ href, src, alt, className }) {
    const image = <img src={src} alt={alt} className={className} />;

    if (!hasRealHref(href)) {
        return image;
    }

    return (
        <a href={href} target="_blank" rel="noreferrer">
            {image}
        </a>
    );
}

function Footer() {
    const shopInfoQuery = useShopInfo();
    const shopInfo = shopInfoQuery.data?.data;
    const social = shopInfo?.social_links || {};
    const certificationLinks = shopInfo?.certification_links || {};
    const footerSocialLinks = socialLinks.map((item) => ({
        ...item,
        href: social[item.key] || item.href,
    }));
    const configuredWorkingHours = shopInfo?.working_hours?.length
        ? shopInfo.working_hours
        : null;
    const shopName = shopInfo?.shop_name || 'NguyenLien Shop';
    const phone = shopInfo?.phone || '0909 123 456';
    const email = shopInfo?.email || 'support@nguyenlien.shop';
    const address = shopInfo?.address || translate('text.nguyenlien_shop_warehouse_city_ho_chi_minh');
    const shippingText = shopInfo?.shipping_partner
        ? translate('text.nationwide_delivery_via_value', { value0: shopInfo.shipping_partner })
        : translate('text.nationwide_delivery_via_shipping_partner');

    return (
        <footer className="mt-auto border-t border-[var(--color-border)] bg-[#f3faf5] text-[var(--color-text-main)]">
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.35fr_1.25fr_1fr_1fr]">
                    <section className="space-y-4">
                        <Link
                            to={ROUTES.HOME}
                            className="inline-flex rounded-full bg-white px-4 py-2 shadow-sm"
                        >
                            <img
                                src={logo}
                                alt={translate('text.nguyenlien_shop')}
                                className="h-9 w-auto object-contain"
                            />
                        </Link>

                        <p className="max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
                            {shopName} {translate('text.provides_fruit_bags_fabric_bags_and_materials_to_support_fruit_protectio')} </p>

                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.purchase_suggestions')}</FooterTitle>
                            <ul className="space-y-1.5">
                                <ContactLine icon={Phone}> {translate('text.hotline')} {phone}
                                </ContactLine>
                                <ContactLine icon={Mail}> {translate('text.email_4c4e6b2d')} {email}
                                </ContactLine>
                                <ContactLine icon={Globe2}> {translate('text.website_nguyenlien_shop')} </ContactLine>
                                <ContactLine icon={MessageCircle}> {translate('text.zalo_bd2a5c19')} {social.zalo || shopName}
                                </ContactLine>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.address')}</FooterTitle>
                            <ul className="space-y-2">
                                <ContactLine icon={MapPin}>
                                    {address}
                                </ContactLine>
                                <ContactLine icon={MapPin}>
                                    {shippingText}
                                </ContactLine>
                            </ul>
                        </div>

                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.working_time')}</FooterTitle>
                            <ul className="space-y-2">
                                {configuredWorkingHours ? (
                                    configuredWorkingHours.map((hour) => (
                                        <ContactLine key={hour.day} icon={Clock3}>
                                            {formatWorkingHour(hour)}
                                        </ContactLine>
                                    ))
                                ) : (
                                    <>
                                        <ContactLine icon={Clock3}> {translate('text.monday_saturday_8_00_20_00')} </ContactLine>
                                        <ContactLine icon={Clock3}> {translate('text.sundays_and_holidays_9_00_18_00')} </ContactLine>
                                    </>
                                )}
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.information')}</FooterTitle>
                            <nav className="grid gap-2 text-sm text-[var(--color-text-main)]">
                                {infoLinks.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="transition-colors hover:text-[var(--color-primary)]"
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.certification_prestigious')}</FooterTitle>
                            <div className="flex flex-wrap items-center gap-3">
                                <CertificateLogo
                                    href={certificationLinks.ministry_notified}
                                    src={notifiedTradeLogo}
                                    alt={translate('text.notified_to_the_ministry_of_industry_and_trade')}
                                    className="h-18 w-auto object-contain"
                                />
                                <CertificateLogo
                                    href={certificationLinks.ministry_registered}
                                    src={registeredTradeLogo}
                                    alt={translate('text.registered_with_the_ministry_of_industry_and_trade')}
                                    className="h-14 w-auto object-contain"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.payment_method')}</FooterTitle>
                            <div className="flex flex-wrap gap-2">
                                {paymentMethods.map((method) => {
                                    const Icon = method.icon;

                                    return (
                                        <span
                                            key={method.label}
                                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                                            style={{
                                                background: method.background,
                                                borderColor: method.border,
                                                color: method.color,
                                            }}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {method.label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white/85 p-4 shadow-sm">
                            <FooterTitle>{translate('text.follow_at')}</FooterTitle>
                            <div className="grid gap-2">
                                {footerSocialLinks.map((item) => {
                                    const Icon = item.icon;
                                    const linkProps = hasRealHref(item.href)
                                        ? { target: '_blank', rel: 'noreferrer' }
                                        : {};

                                    return (
                                        <a
                                            key={item.label}
                                            href={item.href}
                                            {...linkProps}
                                            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                                            style={{
                                                background: item.background,
                                                borderColor: item.border,
                                                color: item.color,
                                            }}
                                        >
                                            <span
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                                style={{
                                                    background: item.iconBackground,
                                                    color: item.iconColor,
                                                    boxShadow: item.iconShadow,
                                                }}
                                            >
                                                <Icon className="h-3.5 w-3.5" />
                                            </span>
                                            {item.label}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div className="border-t border-[var(--color-border)] bg-white/60 px-4 py-4 text-center text-sm font-medium text-[var(--color-text-main)]"> {translate('text.copyright_2026_nguyenlien_shop_all_rights_reserved')} </div>
        </footer>
    );
}

export default Footer;
