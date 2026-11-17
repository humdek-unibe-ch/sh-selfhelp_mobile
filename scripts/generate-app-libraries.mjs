/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Writes the list of libraries this app is really built with, for the "about
 * the platform" block of the `version` style (the group under the `label_app`
 * heading).
 *
 * Source of truth: `package.json` `dependencies` (the production set, never
 * `devDependencies`) and, for each name, the `version` and `license` of the
 * package that is actually installed in `node_modules`. Nothing is typed by
 * hand.
 *
 * Output: `config/appLibraries.generated.json`, an array of
 * `{ name, version, license }` (the shared `IAboutItem` shape), sorted by name.
 *
 * The output IS committed, unlike the web app's list. Two build paths never run
 * an npm hook: EAS cloud builds upload tracked files only, and the web preview
 * image runs `expo export` directly after `npm ci`. A committed file reaches
 * every build, and it cannot drift quietly: `npm test`
 * (`__tests__/unit/appLibraries.test.mjs`) and `--check` fail when the file
 * differs from what is installed.
 *
 * After changing `dependencies`, run `npm install`, then
 * `npm run generate:app-libraries`, and commit the result.
 *
 *   node scripts/generate-app-libraries.mjs           write the file
 *   node scripts/generate-app-libraries.mjs --check   exit 1 when it is stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

export const APP_LIBRARIES_OUTPUT = join(REPO_ROOT, 'config', 'appLibraries.generated.json');
export const GENERATE_COMMAND = 'npm run generate:app-libraries';

/**
 * One licence string for an installed package, or `null` when it declares none.
 *
 * npm packages write the licence as an SPDX string (`MIT`, `(MIT OR Apache-2.0)`),
 * the older `{ type }` object, or the deprecated `licenses: [{ type }]` array.
 * Several licences are joined with ` OR `, the same convention the backend and
 * the web app use for their lists.
 *
 * @param {Record<string, unknown>} pkg Parsed `package.json` of the installed package.
 * @returns {string | null}
 */
export function normalizeLicense(pkg) {
    const types = [];
    const pushType = (value) => {
        if (typeof value === 'string' && value.trim() !== '') {
            types.push(value.trim());
        } else if (value && typeof value === 'object' && typeof value.type === 'string' && value.type.trim() !== '') {
            types.push(value.type.trim());
        }
    };

    pushType(pkg.license);
    if (types.length === 0 && Array.isArray(pkg.licenses)) {
        pkg.licenses.forEach(pushType);
    }

    return types.length === 0 ? null : [...new Set(types)].join(' OR ');
}

/**
 * Builds the list from a `package.json` and an install directory.
 *
 * A dependency that is not installed is left out and returned in `missing`,
 * because the list must say what is really installed, not what is declared.
 *
 * @param {{ packageJsonPath?: string, nodeModulesDir?: string }} [options]
 * @returns {{ items: { name: string, version: string | null, license: string | null }[], missing: string[] }}
 */
export function collectAppLibraries({
    packageJsonPath = join(REPO_ROOT, 'package.json'),
    nodeModulesDir = join(REPO_ROOT, 'node_modules'),
} = {}) {
    const root = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const names = Object.keys(root.dependencies ?? {});

    const items = [];
    const missing = [];
    for (const name of names) {
        // Read the file directly: `require.resolve('<pkg>/package.json')` is
        // blocked by packages whose `exports` map hides it.
        const file = join(nodeModulesDir, ...name.split('/'), 'package.json');
        if (!existsSync(file)) {
            missing.push(name);
            continue;
        }
        const installed = JSON.parse(readFileSync(file, 'utf8'));
        items.push({
            name,
            version: typeof installed.version === 'string' && installed.version !== '' ? installed.version : null,
            license: normalizeLicense(installed),
        });
    }

    // Plain code-unit order: the same result on every machine and locale.
    items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    return { items, missing };
}

/**
 * The exact bytes written to disk: pretty JSON with a trailing newline.
 *
 * @param {{ name: string, version: string | null, license: string | null }[]} items
 * @returns {string}
 */
export function renderAppLibraries(items) {
    return `${JSON.stringify(items, null, 2)}\n`;
}

/**
 * @param {{ name: string, version: string | null, license: string | null }[]} items
 * @param {string} [outputPath]
 */
export function writeAppLibraries(items, outputPath = APP_LIBRARIES_OUTPUT) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderAppLibraries(items));
}

/**
 * Collects the list and writes it, unless a dependency is not installed.
 *
 * The output is committed, so a partial install (a checkout without `npm ci`)
 * must never shorten it: nothing is written and the missing names are returned.
 *
 * @param {{ packageJsonPath?: string, nodeModulesDir?: string, outputPath?: string }} [options]
 * @returns {{ ok: true, count: number } | { ok: false, missing: string[] }}
 */
export function generateAppLibraries(options = {}) {
    const { outputPath = APP_LIBRARIES_OUTPUT } = options;
    const { items, missing } = collectAppLibraries(options);

    if (missing.length > 0) {
        return { ok: false, missing };
    }
    writeAppLibraries(items, outputPath);
    return { ok: true, count: items.length };
}

/**
 * Compares the committed file with what the installed packages say now.
 *
 * The comparison is on the parsed content, so a checkout that rewrote line
 * endings (`core.autocrlf` on Windows) is not reported as stale.
 *
 * - `not-installed`: a dependency is missing from `node_modules`, nothing can be checked.
 * - `missing-file`: the committed file does not exist.
 * - `invalid-file`: the committed file is not valid JSON.
 * - `stale`: the committed file differs from the installed packages.
 *
 * @param {{ packageJsonPath?: string, nodeModulesDir?: string, outputPath?: string }} [options]
 * @returns {{ ok: true } | { ok: false, reason: 'not-installed' | 'missing-file' | 'invalid-file' | 'stale', missing?: string[] }}
 */
export function checkAppLibraries(options = {}) {
    const { outputPath = APP_LIBRARIES_OUTPUT } = options;
    const { items, missing } = collectAppLibraries(options);

    if (missing.length > 0) {
        return { ok: false, reason: 'not-installed', missing };
    }
    if (!existsSync(outputPath)) {
        return { ok: false, reason: 'missing-file' };
    }

    let committed;
    try {
        committed = JSON.parse(readFileSync(outputPath, 'utf8'));
    } catch {
        return { ok: false, reason: 'invalid-file' };
    }

    return JSON.stringify(committed) === JSON.stringify(items) ? { ok: true } : { ok: false, reason: 'stale' };
}

/**
 * @param {ReturnType<typeof checkAppLibraries>} result A failed check.
 * @returns {string}
 */
export function describeFailure(result) {
    if (result.ok) {
        return '';
    }
    switch (result.reason) {
        case 'not-installed':
            return `Cannot check: not installed in node_modules: ${(result.missing ?? []).join(', ')}. Run "npm ci" first.`;
        case 'missing-file':
            return `config/appLibraries.generated.json is missing. Run "${GENERATE_COMMAND}" and commit it.`;
        case 'invalid-file':
            return `config/appLibraries.generated.json is not valid JSON. Run "${GENERATE_COMMAND}" and commit it.`;
        default:
            return `config/appLibraries.generated.json is out of date with the installed packages. Run "${GENERATE_COMMAND}" and commit it.`;
    }
}

function runCli(args) {
    if (args.includes('--check')) {
        const result = checkAppLibraries();
        if (result.ok) {
            console.log('config/appLibraries.generated.json is up to date.');
        } else {
            console.error(describeFailure(result));
            process.exitCode = 1;
        }
        return;
    }

    const result = generateAppLibraries();
    if (!result.ok) {
        console.error(`Not written: not installed in node_modules: ${result.missing.join(', ')}. Run "npm ci" first.`);
        process.exitCode = 1;
        return;
    }
    console.log(`Wrote ${result.count} app libraries to ${APP_LIBRARIES_OUTPUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runCli(process.argv.slice(2));
}
