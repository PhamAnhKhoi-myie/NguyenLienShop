import { MapPin, Image, Navigation } from 'lucide-react';

import locationImage1 from '../../../assets/images/location-image-1.png';
import locationImage2 from '../../../assets/images/location-image-2.png';
import locationImage3 from '../../../assets/images/location-image-3.png';

function StoreLocationPage() {
    const mapEmbedUrl =
        'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d245.29432249784847!2d106.24577436613909!3d10.36512372816542!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1svi!2s!4v1779715895529!5m2!1svi!2s';

    return (
        <div className="space-y-8">
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm md:p-7">
                <div className="max-w-3xl">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                        <MapPin className="h-4 w-4" />
                        Google Map
                    </p>

                    <h1 className="mt-3 text-2xl font-bold text-[var(--color-text-main)] md:text-3xl">
                        Vị trí cửa hàng NguyenLien Shop
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)] md:text-base">
                        Bạn có thể xem vị trí cửa hàng trên bản đồ bên dưới để dễ dàng tìm đường
                        khi đến mua hàng trực tiếp. Bản đồ được nhúng từ Google Maps.
                    </p>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm md:p-7">
                <div className="mb-5 flex items-center gap-2">
                    <Image className="h-5 w-5 text-[var(--color-primary)]" />
                    <h2 className="text-xl font-semibold text-[var(--color-text-main)]">
                        Hình ảnh cửa hàng
                    </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-gray-100">
                        <img
                            src={locationImage1}
                            alt="Hình ảnh cửa hàng Nguyễn Liên Shop 1"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-gray-100">
                        <img
                            src={locationImage2}
                            alt="Hình ảnh cửa hàng Nguyễn Liên Shop 2"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-gray-100">
                        <img
                            src={locationImage3}
                            alt="Hình ảnh cửa hàng Nguyễn Liên Shop 3"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm md:p-7">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                            <Navigation className="h-4 w-4" />
                            Bản đồ cửa hàng
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-main)]">
                            Xem vị trí trên Google Maps
                        </h2>
                    </div>

                </div>

                <div className="h-[520px] overflow-hidden rounded-2xl border border-[var(--color-border)]">
                    <iframe
                        title="Bản đồ cửa hàng Nguyễn Liên Shop"
                        src={mapEmbedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            </section>
        </div>
    );
}

export default StoreLocationPage;