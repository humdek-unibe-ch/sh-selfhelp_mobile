/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Best practices

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code, configuration, and tests in this repository.

Project-specific dos and don'ts. Cross-cutting RN best practices (keys in lists, avoid inline arrow handlers in hot paths, etc.) still apply.

## Do

- **Read CMS fields via helpers** in `components/renderer/useField.ts`. They handle missing fields, type coercion, and translation defaults.
- **Render children with `<Children>`**. It runs condition evaluation + interpolation in the right order.
- **Use `getApiClient()`** for every backend call. The interceptor handles auth, refresh, and `X-Client-Type`.
- **Use the shared package for all types and endpoints**. Don't duplicate `IUserData` or hardcode `/cms-api/v1/auth/login`.
- **Persist secrets in SecureStore**. Memory for access tokens, SecureStore for refresh tokens.
- **Guard every native API behind a permission helper**. See `native/permissions.ts`.
- **Use Tailwind tokens, not inline styles** wherever Uniwind / the allow-list covers the case. Inline styles are fine for one-off pixel tweaks.
- **Test on a real device** before tagging a release — emulators miss push, audio, and biometric flows.

## Don't

- **Don't hand-roll axios instances**. They will silently miss auth + refresh.
- **Don't read `section.fields[name]` directly**. Use the helpers; they handle the `content` / `id` shape.
- **Don't put logic in `*.styles.ts`**. They are constants.
- **Don't bypass the allow-list**. If editors need a token mobile doesn't support, extend the allow-list — don't smuggle classes through.
- **Don't use `localStorage`** in a way that web preview can't tell apart from real native storage. Use `secureStore` so the same code runs on both.
- **Don't ship console logs**. ESLint is configured to warn on `console.log` — wrap in `if (__DEV__)`.
- **Don't swallow errors silently**. The error boundary catches render errors; service-layer errors should bubble back to the caller and surface in the UI.
- **Don't push directly to main**. Open a PR; the typecheck + lint gates exist for a reason.

## Performance

- TanStack Query persists caches across cold starts. Set `staleTime` rather than `gcTime` for "fresh enough" data; `gcTime` only controls eviction.
- Keep page-tree depth shallow when possible. The renderer recurses cleanly but each section adds a `View`.
- Use `expo-image` over `Image` for any image bigger than ~64px — it caches and decodes off the JS thread.
- For long lists, use `FlatList` (not `map`); the renderer doesn't auto-virtualize.

## Accessibility

- Set `accessibilityLabel` on icon-only `Pressable`s.
- Don't disable native focus rings on web preview — they're visible only with keyboard nav and removing them hurts a11y.
- Honour the user's font scale. Avoid hardcoded `fontSize`; rely on Mantine `text-{size}` mappings.

## Error handling

- React render errors → caught by the global ErrorBoundary, with retry.
- Network errors → service layer returns a typed result (`{ kind: 'error', message }`). The caller decides UI.
- Validation errors from the backend (`field_errors`) → mapped to the form's per-field error map.
- Unhandled native errors (push, deep link parse) → silently swallowed in production but logged in dev.

## When in doubt

Look at how an existing similar style/component does it. Most patterns repeat — duplicate them rather than inventing a new way.
