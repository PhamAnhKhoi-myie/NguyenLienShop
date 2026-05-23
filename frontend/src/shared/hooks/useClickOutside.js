import { useEffect } from 'react';

export function useClickOutside(refs, handler, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const refList = Array.isArray(refs) ? refs : [refs];

        const handleMouseDown = (event) => {
            const clickedInside = refList.some((ref) => {
                return ref.current && ref.current.contains(event.target);
            });

            if (!clickedInside) {
                handler(event);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                handler(event);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [refs, handler, enabled]);
}