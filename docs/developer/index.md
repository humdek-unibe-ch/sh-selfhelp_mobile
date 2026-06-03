# Mobile Developer Documentation

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`).
Last verified: 2026-06-03.
Source of truth: `app/`, `components/`, `services/`, `hooks/`, `providers/`, `stores/`, `styles/`, and `config/`.

Engineering documentation for the mobile app. See [../README.md](../README.md) for the full docs map.

- [architecture.md](architecture.md) - High-level diagrams, request flow, and layers.
- [auth-bootstrap.md](auth-bootstrap.md) - Server restore, auth persistence, refresh, direct reloads, and live updates.
- [development.md](development.md) - Day-to-day workflow, scripts, debug tools, and conventions.
- [best-practices.md](best-practices.md) - Do/don't list and performance/accessibility notes.
- [plugins.md](plugins.md) - How the mobile app consumes SelfHelp plugins.

## Styling

- [styling/cms-classes.md](styling/cms-classes.md) - The `css_mobile` allow-list and remap pipeline.
- [styling/mantine-tokens.md](styling/mantine-tokens.md) - Mapping Mantine semantic props to HeroUI/Uniwind.
- [styling/component-pattern.md](styling/component-pattern.md) - The four-file split and when single-file is fine.
