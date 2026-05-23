import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({
    open,
    title = 'Xác nhận thao tác',
    description,
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
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
