/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mobile Plugin Bundling

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code, configuration, and tests in this repository.

Plugins are a first-class extension point of the SelfHelp CMS. The web
host loads plugin packages dynamically at runtime, but the mobile app
**cannot** do that — JavaScriptCore / Hermes both ban dynamic
`import()` of arbitrary URLs, and EAS Update is the only way we can
ship JS into a published mobile build.

This document explains how plugin packages are bundled into the mobile
app per EAS profile, and how the runtime falls back to the web host
when a plugin style is declared on the backend but **not** bundled in
the current build.

> Audience: mobile build operators (EAS) and plugin authors who ship a
> mobile package.

---

## 1. Lifecycle Overview

```
┌─────────────────────┐     plugins:sync (per profile)
│ Backend CMS         │ ◄──────────────────────────────────────────┐
│ /cms-api/v1/        │                                            │
│ plugins/manifest    │                                            │
└─────────────────────┘                                            │
          │                                                        │
          │ live manifest                                          │
          ▼                                                        │
┌─────────────────────┐    writes        ┌────────────────────────┴┐
│ plugins-sync.mjs    │ ───────────────▶ │ selfhelp.plugins.mobile  │
│ (Node CLI)          │                  │ .lock.json (per profile) │
└─────────────────────┘                  └─────────────┬───────────┘
          │                                            │
          │ generates                                  │
          ▼                                            ▼
┌─────────────────────┐                  ┌──────────────────────────┐
│ components/styles/  │                  │ package.json             │
│ registered.ts       │                  │ dependencies updated     │
└─────────────────────┘                  └──────────────────────────┘
          │
          │ EAS build / EAS Update bundles
          ▼
┌─────────────────────┐
│ Mobile binary       │
│ (Hermes / iOS / RN) │
└─────────────────────┘
```

---

## 2. Bundling Plugins Into a Build

The mobile build pipeline pins one plugin set per build, captured in
the per-profile lock file. The `<profile>` argument is a free-form
label that is recorded in the lock file so reviewers can tell which
EAS profile a given lock was generated for — it does **not** filter
the plugin set, because the public manifest endpoint does not expose
per-profile metadata. To bundle different plugin sets for different
profiles, run the sync against different CMS environments.

### One-shot

```bash
SELFHELP_API_TOKEN=eyJ... npm run plugins:sync -- \
  production-default \
  --backend https://cms.example.com
```

This:

1. Calls `/cms-api/v1/plugins/manifest` with the bearer token.
2. Selects every enabled plugin whose `mobilePackage` field is set in
   the manifest. Plugins without a `mobilePackage` are skipped with a
   warning so a CI log makes the omission explicit.
3. Writes `selfhelp.plugins.mobile.lock.json` — the deterministic lock
   used by CI; the `profile` field records the label supplied above.
4. Regenerates `components/styles/registered.ts` with one import per
   bundled plugin and a `registeredPluginStyleImpls` map keyed by
   plugin style name.
5. Updates `package.json` `dependencies` with the bundled plugin
   packages and their versions.

Re-run the command any time the live manifest changes upstream and
you want the mobile build to follow.

### Dry run

Use `--dry-run` to preview the changes without writing anything to
disk:

```bash
npm run plugins:sync -- production-default \
  --backend https://cms.example.com \
  --dry-run
```

The script prints what `package.json` and `registered.ts` *would*
contain. Useful before reviewing a PR.

### CI integration

A typical EAS build pipeline looks like this:

```yaml
- name: Pin mobile plugins
  run: |
    npm run plugins:sync -- ${{ matrix.profile }} \
      --backend ${{ secrets.SELFHELP_CMS_URL }}
  env:
    SELFHELP_API_TOKEN: ${{ secrets.SELFHELP_API_TOKEN }}

- name: Validate profile
  run: npm run instance:validate ${{ matrix.profile }}

- name: Install
  run: npm ci

- name: Build
  run: eas build --profile ${{ matrix.profile }} --non-interactive
```

After `plugins:sync` runs, `package.json` is mutated. CI must `npm ci`
**after** the sync so the pinned plugin packages are installed before
the Metro bundle is produced.

---

## 3. Runtime Behavior

`components/renderer/BasicStyle.tsx` dispatches a section through this
chain:

1. **Core style** — defined in `STYLE_REGISTRY` of `@selfhelp/shared`?
   → render through `styleImpls[name]`.
2. **Bundled plugin style** — defined in
   `registeredPluginStyleImpls[name]` (i.e. the EAS build included
   the plugin's mobile package)? → render the plugin component.
3. **Plugin style with no mobile bundle** — defined in the *shared*
   plugin registry (so the host knows it exists) but missing from the
   current bundle? → render `OpenOnWebFallback`, prompting the user
   to open the web app at the same URL.
4. **Unknown style** — last resort, dev-only warning.

The fallback never crashes the page. It is the intended UX for:

- plugins that don't ship a mobile package at all (web-only);
- plugins whose backend version is newer than the bundle's resolved
  SDK range;
- plugins not yet bundled into the current build (re-run the sync to
  pick them up).

---

## 4. EAS Update vs EAS Build

Plugin packages ship JavaScript only (no native modules). That means
EAS Update can deliver a new plugin set to an already-installed app
without rebuilding the binary, **provided** the plugin does not pull
in new native dependencies.

Recommended workflow:

- **EAS Build** is required when a plugin introduces a new
  `react-native-*` package with native code (e.g. a plugin that uses
  the Camera API or background tasks). Re-run `plugins:sync`, commit,
  then trigger an EAS build.
- **EAS Update** is sufficient when plugins only change JS / TS code
  (which is the case for ~80% of plugin updates). Run
  `plugins:sync`, commit, then `eas update --branch <channel>`.

The mobile app's `expo-updates` runtime fetches the latest update at
launch; users get the new plugin set with a single restart.

---

## 5. Versioning & Compatibility

The plugin lock pins both the plugin's manifest version and the npm
package version. The runtime compares the plugin's declared
`pluginApiVersion` against the mobile build's bundled
`PLUGIN_API_VERSION` (from `@selfhelp/shared/plugin-sdk`):

- **Same major + bundle minor >= plugin minor** → bundled and used.
- **Any other case** → the plugin is excluded from `registered.ts`
  with a comment, and the runtime falls back to `OpenOnWebFallback`.

This means a backend operator can safely roll out a plugin minor that
the current EAS build doesn't yet know about — the app degrades to
the web fallback until the next mobile release picks the new SDK up.

---

## 6. Auditing What Is Bundled

`selfhelp.plugins.mobile.lock.json` is the source of truth for the
bundled set. Commit it. A typical entry looks like:

```json
{
  "schemaVersion": "1.0",
  "generatedBy": "plugins-sync@production-default",
  "generatedAt": "2026-05-21T13:42:00.000Z",
  "profile": "production-default",
  "plugins": [
    {
      "id": "sh2-shp-survey-js",
      "version": "1.0.0",
      "pluginApiVersion": "1.0",
      "package": "@selfhelp-mobile/sh2-shp-survey-js",
      "packageVersion": "1.0.0"
    }
  ]
}
```

Each entry corresponds 1:1 to the row the backend manifest emits for
that plugin: `id` ← `pluginId`, `package` ← `mobilePackage`, and
`packageVersion` ← `mobilePackageVersion` (falling back to `version`
when the backend leaves the mobile-package version blank).

---

## 7. Removing a Plugin

To remove a plugin from a profile, re-run `plugins:sync` after the
plugin has been disabled or uninstalled in the CMS. The script will
omit it from the next lock and `registered.ts` build, and trim its
package from `dependencies`. Commit, build / update.

---

## 8. Troubleshooting

| Symptom                                                        | Cause / fix                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `plugins-sync: --backend <url> is required.`                   | Pass `--backend https://cms.example.com`.                           |
| 401 fetching `/cms-api/v1/plugins/manifest`                    | Set `SELFHELP_API_TOKEN` in the shell or CI secret store.            |
| `registered.ts` imports fail at Metro bundle time              | The plugin package version pinned by the lock is not yet on the npm registry; publish it first. |
| Mobile renders `OpenOnWebFallback` for a style you expected    | Either the plugin is missing from the current bundle, the version doesn't satisfy the SDK range, or the live backend doesn't yet host the plugin. |
| Plugin works in dev but fails in EAS build                     | Run `npm run plugins:sync -- <profile>` before `eas build`; CI must do this in the same job. |
