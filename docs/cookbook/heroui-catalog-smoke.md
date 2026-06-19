/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Smoke-test the HeroUI Native CMS style catalog

Audience: Developers / QA verifying the extended HeroUI Native catalog end-to-end.
Status: active.
Applies to: SelfHelp2 backend (`sh-selfhelp_backend`), web frontend (`sh-selfhelp_frontend`), mobile app (`sh-selfhelp_mobile`), shared (`@selfhelp/shared`).
Last verified: 2026-06-18.
Source of truth: The seed migration `Version20260618143218`, the shared registry `BASE_STYLE_REGISTRY`, and the web/mobile renderers wired in this change.

The extended catalog adds these CMS styles. All are `both` (Mantine on web,
HeroUI Native on mobile) except the mobile-only ones noted below.

| style | platform | parent/child rule |
| --- | --- | --- |
| `dialog` | both | container |
| `popover` | both | container |
| `menu` | both | **only `menu-item` children** |
| `menu-item` | both | **only under `menu`** (may nest a `menu`) |
| `bottom-sheet` | mobile-only | container; web preview shows "Not supported" |
| `skeleton` | both | leaf |
| `skeleton-group` | both | container |
| `spinner` | both | leaf |
| `toast` | both | leaf |
| `tag-group` | both | **only `tag` children** |
| `tag` | both | **only under `tag-group`** |
| `input-group` | both | container (inputs) |
| `input-otp` | both | leaf |
| `search-field` | both | leaf |
| `fab-button` | mobile-only | leaf |
| `biometric-login-button` | mobile-only | leaf |

## 0. Prerequisites

- Backend migrated through `Version20260618143218` (seeds the catalog) and cache
  cleared. Verify in the CMS the styles appear in the "Add section" picker.
- Shared built and synced to both consumers (`@selfhelp/shared` >= 1.9.0).
- A CMS admin login for the web frontend.

## 1. Create three test pages in the CMS (web admin)

Create one page per platform target so you can confirm the picker filtering and
the renderer's platform guard:

1. `qa-catalog-both` — platform **both**.
2. `qa-catalog-web` — platform **web**.
3. `qa-catalog-mobile` — platform **mobile**.

In the "Add section" modal, confirm styles are grouped by platform (Mobile / Web
/ Both) and that the picker only offers styles compatible with the page's
platform (e.g. `fab-button` is hidden on the web-only page).

## 2. Import the catalog onto the `both` page

Use the ready-made payload [heroui-catalog-import.json](heroui-catalog-import.json)
(only style-valid fields; translatable fields are provided in `de-CH` + `en-GB`,
internal fields under `all`). Import it into `qa-catalog-both` via the CMS
"Import sections" action (page-level import).

The payload exercises every new style, including the strict compounds
(`menu → menu-item`, `tag-group → tag`) and the mobile-only `bottom-sheet` /
`fab-button` / `biometric-login-button`.

> If your CMS content language is neither `de-CH` nor `en-GB`, add an entry for
> your locale next to the existing ones, or set the admin content language to
> English before importing. The importer rejects unregistered locales.

## 3. Verify on web preview (Mantine)

Open `qa-catalog-both` in the web frontend. Expect:

- `dialog` → a button that opens a Mantine `Modal`.
- `popover` / `menu` → a button trigger opening a Mantine `Popover` / `Menu`.
- `skeleton` / `skeleton-group` → Mantine `Skeleton` placeholders.
- `spinner` → Mantine `Loader` (+ label).
- `toast` → static Mantine `Notification` (green/success).
- `tag-group` → wrapping row of Mantine `Badge` pills.
- `input-otp` → Mantine `PinInput` (6 numeric cells).
- `search-field` → Mantine `TextInput` with a search icon.
- `bottom-sheet`, `fab-button`, `biometric-login-button` → **silently skipped**
  on web (mobile-only; the dispatcher's platform guard drops them — this is not
  an "unknown style").

## 4. Verify on mobile (HeroUI Native / RN handlers)

Point the mobile app at the same backend and open the `qa-catalog-both` page by
keyword. Expect each style to render its mobile presentation. On **Expo Web**
preview the same HeroUI Native presentation renders too — `HeroUINativeProvider`
is mounted on web — so the catalog should look the same in the browser. Only the
few capabilities with no web equivalent (e.g. `bottom-sheet`,
`biometric-login-button`) show the explicit "Not supported in web preview" notice;
verify those on a device/emulator for the real native rendering.

## 5. Use the HeroUI MCP docs while iterating

When refining the mobile presentation toward full HeroUI Native fidelity, use the
HeroUI Native MCP component docs (and the in-browser mobile preview) to confirm
component props and compound structure before wiring them through the
`components/ui/adapters` contract.

## Done criteria

- All three pages render without crashes.
- The `both` styles render Mantine on web and their mobile presentation on
  native.
- Mobile-only styles are skipped on web and render (or show the explicit
  unsupported notice) on mobile.
- The strict compounds only accept their declared children in the CMS editor.
