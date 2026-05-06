/**
 * Accordion state hook. Encapsulates the toggle logic so the render
 * file stays declarative.
 */

import { createContext, useContext, useMemo, useState } from 'react';

import type { IAccordionContext } from './Accordion.types';

export const AccordionContext = createContext<IAccordionContext | null>(null);

export function useAccordionContext(): IAccordionContext | null {
    return useContext(AccordionContext);
}

export function useAccordionState(multiple: boolean): IAccordionContext {
    const [open, setOpen] = useState<Set<string>>(new Set());

    return useMemo<IAccordionContext>(
        () => ({
            open,
            multiple,
            toggle: (key: string) => {
                setOpen((prev) => {
                    const next = new Set(multiple ? prev : []);
                    if (prev.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                });
            },
        }),
        [multiple, open]
    );
}
