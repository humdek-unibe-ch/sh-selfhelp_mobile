/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile preview release floors. Package SemVer may lag core; `supports.core`
 * is the authoritative pairing signal for the registry resolver.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import semver from 'semver';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const manifest = JSON.parse(readFileSync(join(root, 'release-manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('supports.core requires >=0.1.45 (authoritative vs package version)', () => {
    assert.equal(manifest.kind, 'mobile-preview');
    assert.equal(manifest.supports.core, '>=0.1.45 <0.2.0');
});

test('pins @selfhelp/shared to 1.25.0 (list-is-the-form types + FORM_SECTION_STYLE_NAMES)', () => {
    assert.equal(pkg.dependencies['@selfhelp/shared'], '1.25.0');
    assert.equal(
        pkg.overrides['@selfhelp/shared'],
        '$@selfhelp/shared',
        'the override must follow the dependency pin (a literal version makes `npm install --no-save <packed artifact>` fail with EOVERRIDE)',
    );
    assert.notEqual(
        pkg.version,
        '0.1.45',
        'package SemVer need not match core; supports.core is authoritative',
    );
});

test('lockfile still resolves published 1.24.0 until shared 1.25.0 is on npm (F151)', () => {
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    assert.equal(lock.packages[''].dependencies['@selfhelp/shared'], '1.24.0');
    assert.equal(lock.packages['node_modules/@selfhelp/shared'].version, '1.24.0');
    assert.equal(
        lock.packages['node_modules/@selfhelp/shared'].resolved,
        'https://registry.npmjs.org/@selfhelp/shared/-/shared-1.24.0.tgz',
    );
});

test('mobile package 0.1.37 + supports.core accepts core 0.1.45 and rejects 0.1.44', () => {
    assert.equal(pkg.version, '0.1.37');
    const range = manifest.supports.core;
    assert.equal(semver.satisfies('0.1.45', range, { includePrerelease: true }), true);
    assert.equal(semver.satisfies('0.1.44', range, { includePrerelease: true }), false);
});

test('supports.core is a concrete semver range string', () => {
    assert.equal(typeof manifest.supports?.core, 'string');
    assert.ok(semver.validRange(manifest.supports.core));
    assert.match(manifest.supports.core, />=0\.1\.45/);
});
