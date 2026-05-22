/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Plugin-contributed mobile style implementations. This file is
 * **generated** by `scripts/plugins-sync.mjs` for each EAS profile and
 * committed into the EAS build artefact. Do not edit by hand.
 *
 * The base file (this one) is checked in and stays empty so a clean
 * checkout type-checks against the shared registry. The sync script
 * regenerates the imports + the `registeredPluginStyleImpls` map from
 * the live `/cms-api/v1/plugins/manifest` response, scoped to the EAS
 * profile being built.
 *
 * Plugins whose mobile package is `readonly` only contribute the
 * read-only style impl; plugins without a mobile package at all do
 * not appear here and are routed to `OpenOnWebFallback` at runtime.
 */

import type { TPluginStyleImplMap } from '@/components/renderer/types';

export const registeredPluginStyleImpls: TPluginStyleImplMap = {};

/**
 * Owner index: maps every plugin style name to the owning plugin id.
 * Used by `BasicStyle.tsx` so the open-on-web fallback can construct
 * a deep link to the web host.
 */
export const registeredPluginStyleOwners: Record<string, string> = {};
