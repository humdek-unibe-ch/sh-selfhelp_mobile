/**
 * Lightweight in-memory debug log buffer used by the floating debug
 * panel. Mirrors the spirit of `sh-selfhelp_frontend`'s debug-logger
 * but keeps the dependency footprint to plain JS — no Zustand, no
 * React. Components subscribe via `subscribe()` and re-render on push.
 *
 * Capped at `MAX_ENTRIES`. Older entries roll out as new ones come in.
 *
 * Production builds (`__DEV__ === false`) keep a no-op surface so the
 * code that calls `debugLogger.info(...)` etc. remains a free function
 * call without conditional branching at every site.
 */

export type TDebugLevel = 'debug' | 'info' | 'warn' | 'error';

export interface IDebugLogEntry {
    id: number;
    timestamp: string;
    component: string | null;
    message: string;
    data: unknown;
    level: TDebugLevel;
}

const MAX_ENTRIES = 500;

let nextId = 1;
const entries: IDebugLogEntry[] = [];
const listeners = new Set<(snapshot: readonly IDebugLogEntry[]) => void>();

function notify(): void {
    const snapshot: readonly IDebugLogEntry[] = [...entries];
    listeners.forEach((fn) => {
        try {
            fn(snapshot);
        } catch {
            /* ignore */
        }
    });
}

/* eslint-disable no-console */
const CONSOLE_FN: Record<TDebugLevel, (...args: unknown[]) => void> = {
    debug: (...args) => console.debug(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};
/* eslint-enable no-console */

function push(level: TDebugLevel, component: string | null, message: string, data?: unknown): void {
    if (!__DEV__) return;
    entries.unshift({
        id: nextId++,
        timestamp: new Date().toISOString(),
        component,
        message,
        data,
        level,
    });
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    // Also surface the entry on the standard browser/native console so
    // developers can grep-search the log without opening the floating
    // panel. The prefix mirrors the panel format: `[component] message`.
    const prefix = component ? `[sh:${component}]` : '[sh]';
    if (data !== undefined) {
        CONSOLE_FN[level](prefix, message, data);
    } else {
        CONSOLE_FN[level](prefix, message);
    }
    notify();
}

export const debugLogger = {
    debug: (message: string, component: string | null = null, data?: unknown): void =>
        push('debug', component, message, data),
    info: (message: string, component: string | null = null, data?: unknown): void =>
        push('info', component, message, data),
    warn: (message: string, component: string | null = null, data?: unknown): void =>
        push('warn', component, message, data),
    error: (message: string, component: string | null = null, data?: unknown): void =>
        push('error', component, message, data),
    clear: (): void => {
        entries.length = 0;
        notify();
    },
    snapshot: (): readonly IDebugLogEntry[] => [...entries],
    subscribe: (fn: (snapshot: readonly IDebugLogEntry[]) => void): (() => void) => {
        listeners.add(fn);
        fn([...entries]);
        return () => {
            listeners.delete(fn);
        };
    },
};
