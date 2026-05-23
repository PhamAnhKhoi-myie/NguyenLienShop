function AuthPageCard({ title, subtitle, children }) {
    return (
        <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
                    {title}
                </h1>

                {subtitle ? (
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            <div className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                {children}
            </div>
        </div>
    );
}

export default AuthPageCard;