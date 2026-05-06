/**
 * Tailwind v4 config consumed by Uniwind and HeroUI Native.
 *
 * Tokens are sourced from `@selfhelp/shared` so a class like
 * `text-blue-6` or `p-md` resolves identically across web and mobile.
 *
 * Source globs are ALSO declared in `global.css` via `@source` — we
 * keep both forms in sync; the `@source` directives are what actually
 * drive class extraction in v4, while this config provides theme
 * extension via the legacy `@config` directive.
 *
 * Note: this is `.js` (not `.ts`) so Tailwind v4's `@config` loader can
 * `require()` it without a TS compiler in scope. The shared package is
 * compiled to `dist/` so the require chain works at runtime.
 */
const { sharedTailwindExtend } = require('@selfhelp/shared/tailwind');

module.exports = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './providers/**/*.{ts,tsx}',
        './node_modules/heroui-native/lib/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: sharedTailwindExtend,
    },
    plugins: [],
};
