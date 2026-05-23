import Badge from '../shared/components/Badge';

function Footer() {
    return (
        <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-primary-hover)] text-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">NguyenLien Shop</span>

                <span className="text-green-100">
                    Vật tư nông nghiệp sạch, bảo vệ cây trồng hiệu quả.
                </span>

                <Badge variant="accent">Túi bao trái cây</Badge>
            </div>
        </footer>
    );
}

export default Footer;