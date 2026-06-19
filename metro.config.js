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

/*
 * Mobile UI tier selection (OSS vs paid HeroUI Pro).
 *
 * The app imports UI primitives from the stable `@selfhelp/mobile-pro-ui`
 * specifier. By default it resolves to the in-repo OSS adapters; a Pro
 * build sets `SELFHELP_MOBILE_UI_TIER=pro` and `SELFHELP_MOBILE_PRO_UI_PATH`
 * (pointing at the private `sh-selfhelp_mobile_pro_ui` checkout that lives
 * side-by-side with this repo). The HeroUI Pro token is used only in the
 * private CI that installs/builds that package — never in this repo or its
 * runtime image.
 */
const uiTier = process.env.SELFHELP_MOBILE_UI_TIER === 'pro' ? 'pro' : 'oss';
const ossAdaptersPath = path.resolve(projectRoot, 'components', 'ui', 'adapters', 'oss');
const proAdaptersPath = process.env.SELFHELP_MOBILE_PRO_UI_PATH
    ? path.resolve(projectRoot, process.env.SELFHELP_MOBILE_PRO_UI_PATH)
    : path.resolve(projectRoot, '..', 'sh-selfhelp_mobile_pro_ui');
const mobileProUiResolvedPath = uiTier === 'pro' ? proAdaptersPath : ossAdaptersPath;

config.watchFolders = [sharedRoot];

config.resolver = {
    ...config.resolver,
    nodeModulesPaths: [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(sharedRoot, 'node_modules'),
    ],
    extraNodeModules: {
        ...(config.resolver && config.resolver.extraNodeModules),
        '@selfhelp/mobile-pro-ui': mobileProUiResolvedPath,
    },
};

module.exports = withUniwindConfig(config, {
    cssEntryFile: './global.css',
    dtsFile: './uniwind-types.d.ts',
});
