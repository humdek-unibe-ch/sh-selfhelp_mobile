/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Preloaded via `node --import` for the mobile `node --test` suites
 * (plan Slice 9). Two jobs:
 *
 *   1. Register the alias / extensionless resolve hook (`loader.mjs`).
 *   2. Define the React Native `__DEV__` global. Renderer helpers such as
 *      `cssMobileToUniwind` branch on it; under Node it is otherwise an
 *      undeclared identifier (ReferenceError). We pin it to `false`
 *      (production-like) so the dev-only console noise stays off in tests.
 */

import { register } from 'node:module';

globalThis.__DEV__ = false;

register('./loader.mjs', import.meta.url);
