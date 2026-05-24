#!/usr/bin/env node
/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Sync mobile plugin packages.
 *
 * Reads the live plugin manifest from `/cms-api/v1/plugins/manifest`
 * (or a snapshot lock file pinned to a release) and writes:
 *
 *   1. `selfhelp.plugins.mobile.lock.json` — pinned mobile plugin
 *      entries (deterministic CI input).
 *   2. `components/styles/registered.ts` — generated TypeScript that
 *      imports every bundled plugin's `registerMobile` and merges the
 *      contributed style impls into the mobile renderer.
 *   3. `package.json` — adds / updates the mobile plugin packages
 *      under `dependencies` so they are installed by `npm install`
 *      before the EAS build runs.
 *
 * The backend manifest exposes flat fields only:
 *   - `pluginId`, `version`, `pluginApiVersion`
 *   - `mobilePackage`, `mobilePackageVersion`
 *
 * Plugins without a `mobilePackage` are skipped; the mobile runtime
 * falls back to `OpenOnWebFallback` for their styles. The `<profile>`
 * argument is recorded as a label on the lock file (e.g. for audit
 * trails per EAS build profile) — it does NOT filter the plugin set,
 * because the backend manifest does not expose per-profile metadata.
 *
 * Usage:
 *   node scripts/plugins-sync.mjs <profile> [--backend URL] [--dry-run]
 *
 * Example:
 *   node scripts/plugins-sync.mjs production-default \
 *     --backend https://cms.example.com
 *
 * Environment:
 *   SELFHELP_API_TOKEN — optional bearer token for the manifest endpoint
 *                        (required when the backend requires auth).
 *
 * Exit code:
 *   0  — sync succeeded (or dry-run completed).
 *   1  — sync failed (missing args, fetch error, IO error).
 *   2  — manifest shape invalid.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const profile = args[0];
if (!profile) {
    console.error('Usage: plugins-sync.mjs <profile> [--backend URL] [--dry-run]');
    process.exit(1);
}

let backendUrl = '';
let dryRun = false;
let lockPath = 'selfhelp.plugins.mobile.lock.json';
let registeredPath = 'components/styles/registered.ts';
let packagePath = 'package.json';

for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--backend' && args[i + 1]) {
        backendUrl = args[i + 1];
        i++;
    } else if (arg === '--dry-run') {
        dryRun = true;
    } else if (arg === '--lock' && args[i + 1]) {
        lockPath = args[i + 1];
        i++;
    } else if (arg === '--registered' && args[i + 1]) {
        registeredPath = args[i + 1];
        i++;
    } else if (arg === '--package' && args[i + 1]) {
        packagePath = args[i + 1];
        i++;
    }
}

if (!backendUrl) {
    console.error('plugins-sync: --backend <url> is required.');
    process.exit(1);
}

const token = process.env.SELFHELP_API_TOKEN;

async function fetchManifest(url) {
    const endpoint = `${url.replace(/\/+$/, '')}/cms-api/v1/plugins/manifest`;
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
        throw new Error(`fetch ${endpoint} returned ${res.status}`);
    }
    const body = await res.json();
    if (!body || typeof body !== 'object') {
        throw new Error('manifest endpoint returned a non-object response');
    }
    const payload = body.data ?? body;
    return payload;
}

function assertPluginShape(plugin, idx) {
    if (typeof plugin !== 'object' || plugin === null) {
        throw new Error(`manifest.plugins[${idx}] is not an object.`);
    }
    if (typeof plugin.pluginId !== 'string' || plugin.pluginId === '') {
        throw new Error(`manifest.plugins[${idx}].pluginId must be a non-empty string.`);
    }
    if (typeof plugin.version !== 'string' || plugin.version === '') {
        throw new Error(`manifest.plugins[${idx}].version must be a non-empty string.`);
    }
}

function buildLock(manifest, requestedProfile) {
    const entries = [];
    const skipped = [];
    const plugins = manifest.plugins ?? [];
    for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
        assertPluginShape(plugin, i);
        if (typeof plugin.mobilePackage !== 'string' || plugin.mobilePackage === '') {
            skipped.push(plugin.pluginId);
            continue;
        }
        entries.push({
            id: plugin.pluginId,
            version: plugin.version,
            pluginApiVersion: plugin.pluginApiVersion ?? null,
            package: plugin.mobilePackage,
            packageVersion:
                typeof plugin.mobilePackageVersion === 'string' && plugin.mobilePackageVersion !== ''
                    ? plugin.mobilePackageVersion
                    : plugin.version,
        });
    }
    entries.sort((a, b) => a.id.localeCompare(b.id));
    if (skipped.length > 0) {
        console.warn(`plugins-sync: skipping ${skipped.length} plugin(s) without mobilePackage: ${skipped.join(', ')}`);
    }
    return {
        schemaVersion: '1.0',
        generatedBy: `plugins-sync@${requestedProfile}`,
        generatedAt: new Date().toISOString(),
        profile: requestedProfile,
        plugins: entries,
    };
}

function buildRegisteredFile(lock) {
    const lines = [
        '/*',
        'SPDX-FileCopyrightText: 2026 Humdek, University of Bern',
        'SPDX-License-Identifier: MPL-2.0',
        '*/',
        '/**',
        ' * GENERATED BY scripts/plugins-sync.mjs — DO NOT EDIT BY HAND.',
        ` * Profile: ${lock.profile}`,
        ` * Generated at: ${lock.generatedAt}`,
        ' *',
        ' * Mobile plugin style impls. Re-run `npm run plugins:sync -- <profile>` to update.',
        ' */',
        '',
        "import type { TPluginStyleImplMap } from '@/components/renderer/types';",
        '',
    ];

    const styleEntries = [];

    if (lock.plugins.length === 0) {
        lines.push('export const registeredPluginStyleImpls: TPluginStyleImplMap = {};');
        lines.push('');
        lines.push('export const registeredPluginStyleOwners: Record<string, string> = {};');
        lines.push('');
        lines.push('export const registeredPluginVersions: Record<string, string> = {};');
        lines.push('');
        return lines.join('\n');
    }

    const importLines = [];
    for (let i = 0; i < lock.plugins.length; i++) {
        const plugin = lock.plugins[i];
        const localName = `plugin${i}`;
        importLines.push(`import { registerMobile as ${localName} } from '${plugin.package}';`);
        styleEntries.push({ localName, pluginId: plugin.id });
    }
    lines.push(...importLines);
    lines.push('');

    lines.push('const registrations = [');
    for (const entry of styleEntries) {
        lines.push(`    ${entry.localName},`);
    }
    lines.push('];');
    lines.push('');

    lines.push('function buildStyleImpls(): TPluginStyleImplMap {');
    lines.push('    const map: TPluginStyleImplMap = {};');
    lines.push('    for (const registration of registrations) {');
    lines.push('        if (!registration || !registration.styles) continue;');
    lines.push('        for (const style of registration.styles) {');
    lines.push('            map[style.name] = style.component as unknown as TPluginStyleImplMap[string];');
    lines.push('        }');
    lines.push('    }');
    lines.push('    return map;');
    lines.push('}');
    lines.push('');

    lines.push('function buildOwners(): Record<string, string> {');
    lines.push('    const map: Record<string, string> = {};');
    lines.push('    for (const registration of registrations) {');
    lines.push('        if (!registration || !registration.styles) continue;');
    lines.push('        for (const style of registration.styles) {');
    lines.push('            map[style.name] = registration.id;');
    lines.push('        }');
    lines.push('    }');
    lines.push('    return map;');
    lines.push('}');
    lines.push('');

    lines.push('export const registeredPluginStyleImpls: TPluginStyleImplMap = buildStyleImpls();');
    lines.push('export const registeredPluginStyleOwners: Record<string, string> = buildOwners();');
    lines.push('');

    lines.push('export const registeredPluginVersions: Record<string, string> = {');
    for (const plugin of lock.plugins) {
        const id = JSON.stringify(plugin.id);
        const version = JSON.stringify(plugin.version);
        lines.push(`    ${id}: ${version},`);
    }
    lines.push('};');
    lines.push('');

    return lines.join('\n');
}

async function syncPackageJson(file, lock) {
    const cwd = process.cwd();
    const target = resolve(cwd, file);
    const content = JSON.parse(await readFile(target, 'utf-8'));
    content.dependencies = content.dependencies ?? {};
    for (const plugin of lock.plugins) {
        content.dependencies[plugin.package] = plugin.packageVersion;
    }
    const ordered = Object.keys(content.dependencies)
        .sort()
        .reduce((acc, key) => {
            acc[key] = content.dependencies[key];
            return acc;
        }, {});
    content.dependencies = ordered;
    if (dryRun) {
        console.log('--- package.json (dry-run) ---');
        console.log(JSON.stringify(content, null, 2));
        return;
    }
    await writeFile(target, JSON.stringify(content, null, 2) + '\n', 'utf-8');
}

async function writeFileWithDirs(filePath, contents) {
    const target = resolve(process.cwd(), filePath);
    if (dryRun) {
        console.log(`--- ${filePath} (dry-run) ---`);
        console.log(contents);
        return;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf-8');
}

async function main() {
    try {
        const manifest = await fetchManifest(backendUrl);
        if (!Array.isArray(manifest.plugins)) {
            console.error('plugins-sync: manifest.plugins must be an array.');
            process.exit(2);
        }
        const lock = buildLock(manifest, profile);
        const registered = buildRegisteredFile(lock);

        await writeFileWithDirs(lockPath, JSON.stringify(lock, null, 2) + '\n');
        await writeFileWithDirs(registeredPath, registered);
        await syncPackageJson(packagePath, lock);

        if (!dryRun) {
            console.log(`plugins-sync: wrote ${lockPath} and ${registeredPath} (${lock.plugins.length} plugin(s) bundled for profile ${profile}).`);
        }
    } catch (err) {
        const message = err.message ?? String(err);
        console.error('plugins-sync:', message);
        if (message.startsWith('manifest.plugins') || message.includes('mobilePackage')) {
            process.exit(2);
        }
        process.exit(1);
    }
}

main();
