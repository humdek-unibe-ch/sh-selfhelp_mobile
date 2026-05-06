/**
 * Local types for the Accordion style. Kept out of the main file so the
 * render and the hooks can import them without pulling each other.
 */

export interface IAccordionContext {
    /** Set of currently-open keys. */
    open: Set<string>;
    /** Toggle by key — respects single vs multiple-open mode. */
    toggle: (key: string) => void;
    /** Whether multiple items can be open at the same time. */
    multiple: boolean;
}
