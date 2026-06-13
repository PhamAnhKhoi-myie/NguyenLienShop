import { translate } from '../i18n/index';
import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({
    open,
    title = translate('text.confirm_operation'),
    description,
    confirmLabel = translate('text.confirm'),
    cancelLabel = translate('text.cancel'),
    confirmVariant = 'danger',
    isLoading = false,
    onConfirm,
    onClose,
}) {
    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        isLoading={isLoading}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            {description && (
                <p className="text-sm text-[var(--color-text-muted)]">
                    {description}
                </p>
            )}
        </Modal>
    );
}
