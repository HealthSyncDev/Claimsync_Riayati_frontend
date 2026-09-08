import { toast } from 'sonner';

export const confirmAction = ({
    title = 'Are you sure?',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
}) =>
    new Promise((resolve) => {
        let settled = false;
        const finalize = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        toast(title, {
            description,
            duration: 10000,
            action: {
                label: confirmLabel,
                onClick: () => finalize(true),
            },
            cancel: {
                label: cancelLabel,
                onClick: () => finalize(false),
            },
            onAutoClose: () => finalize(false),
            onDismiss: () => finalize(false),
        });
    });

export { toast };
