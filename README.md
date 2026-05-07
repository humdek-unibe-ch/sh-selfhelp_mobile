# SelfHelp Mobile

Expo / React Native + HeroUI Native + Uniwind app that renders SelfHelp content for end users on iOS, Android, and (for development) web.

## Quick start

```bash
# 1. Build the shared package once (only needed when its source changes).
cd ../sh-selfhelp_shared && npm install && npm run build

# 2. Install mobile deps.
cd ../sh-selfhelp_mobile && npm install

# 3. Start Expo (web, iOS, or Android).
npm run web        # fastest dev loop, works in any browser
npm run android    # requires Android emulator / connected device
npm run ios        # macOS only
```

The dev server picker appears on first launch in dev/preview builds — pick your backend or paste a custom URL. Production builds skip this and use the URL baked into the build profile in `eas.json`.

## Repo layout

| Path           | Contents                                                            |
| -------------- | ------------------------------------------------------------------- |
| `app/`         | Expo Router screens (`(public)`, `(app)`, deep-link entry).         |
| `components/`  | UI components: shared primitives + per-style implementations.       |
| `providers/`   | `AuthProvider`, `ServerProvider`, `QueryProvider`, `HeroUIProvider`.|
| `services/`    | `apiClient`, auth/page/forms services.                              |
| `stores/`      | Zustand stores (server URL, JWT, language).                         |
| `hooks/`       | `usePageContent`, `useAuth`, `useServerUrl`, etc.                   |
| `styles/`      | `cssMobileToUniwind`, mantine token resolver, spacing parser.       |
| `config/`      | Runtime config (instance slug, baked URL, dev servers).             |
| `constants/`   | Stable constants (SecureStore keys, query keys).                    |
| `assets/`      | Splash, icons, fonts.                                               |
| `docs/`        | Setup, builds, deep-linking, push-notifications, cookbook.          |
| `scripts/`     | Build / test helpers.                                               |
| `app.config.ts`| Per-instance Expo config (reads env vars).                          |
| `eas.json`     | EAS Build / Submit profiles (`development`, `preview`, `production-{slug}`). |
| `metro.config.js` | Metro config aware of the sibling shared package.               |
| `babel.config.js` | Babel preset (Expo) + Uniwind + Reanimated.                     |

## Documentation

See `docs/` for the full guide. Highlights:
- `docs/architecture.md` — how the renderer + shared package + backend fit together.
- `docs/auth-bootstrap.md` — server restore, auth persistence, refresh, direct reloads, and live updates.
- `docs/builds.md` — EAS profiles, signing, store submission.
- `docs/server-selection.md` — dev picker vs baked URL.
- `docs/cookbook/add-style.md` — add a new CMS style end-to-end.

## Contributing

- One source of truth lives in `../sh-selfhelp_shared`. Don't fork shared types here.
- Each style is a 4-file component (`Component.tsx`, `Component.styles.ts`, `Component.types.ts`, `index.ts`). Add hooks in `Component.hooks.ts` only when needed.
- Mobile reads the `css_mobile` field only — never `css`. Tailwind classes go through the shared allow-list + remap before Uniwind sees them.
- Keep web and mobile in lockstep: a new field on a style means updating the shared interface and both renderers.
