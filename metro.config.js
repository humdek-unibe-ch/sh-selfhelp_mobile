/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Metro config — extended for:
 *   - Uniwind 1.6 Metro transformer (`withUniwindConfig`).
 *   - Workspace-style consumption of `@selfhelp/shared` via a `file:` dep
 *     (no symlink needed; Metro resolves through the package.json).
 *
 * If you switch to a true monorepo, watchFolders should include the
 * shared package root and `disableHierarchicalLookup` should remain off.
 *
 * `withUniwindConfig` MUST be the outermost wrapper.
 */

const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'sh-selfhelp_shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

config.resolver = {
    ...config.resolver,
    nodeModulesPaths: [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(sharedRoot, 'node_modules'),
    ],
};

module.exports = withUniwindConfig(config, {
    cssEntryFile: './global.css',
    dtsFile: './uniwind-types.d.ts',
});
