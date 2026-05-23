import Card, { CardBody } from './Card';

export default function PagePlaceholder({ title, description, action }) {
    return (
        <Card>
            <CardBody>
                <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
                    {title}
                </h1>
                {description && (
                    <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
                        {description}
                    </p>
                )}
                {action && <div className="mt-5">{action}</div>}
            </CardBody>
        </Card>
    );
}
