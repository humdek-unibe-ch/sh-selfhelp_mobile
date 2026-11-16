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

test('supports.core requires >=0.1.44 (authoritative vs package version)', () => {
    assert.equal(manifest.kind, 'mobile-preview');
    assert.equal(manifest.supports.core, '>=0.1.44 <0.2.0');
});

test('pins @selfhelp/shared to 1.24.0 (entry-list styles + DTOs + strict record versions; not staged 2.x/3.x)', () => {
    assert.equal(pkg.dependencies['@selfhelp/shared'], '1.24.0');
    assert.equal(
        pkg.overrides['@selfhelp/shared'],
        '$@selfhelp/shared',
        'the override must follow the dependency pin (a literal version makes `npm install --no-save <packed artifact>` fail with EOVERRIDE)',
    );
    assert.notEqual(
        pkg.version,
        '0.1.44',
        'package SemVer need not match core; supports.core is authoritative',
    );
});

test('names the same shared version in the lockfile as in package.json', () => {
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const pin = pkg.dependencies['@selfhelp/shared'];
    assert.equal(lock.packages[''].dependencies['@selfhelp/shared'], pin);
    assert.equal(lock.packages['node_modules/@selfhelp/shared'].version, pin);
    assert.equal(
        lock.packages['node_modules/@selfhelp/shared'].resolved,
        `https://registry.npmjs.org/@selfhelp/shared/-/shared-${pin}.tgz`,
    );
});

test('mobile package 0.1.36 + supports.core accepts core 0.1.44 and rejects 0.1.43', () => {
    assert.equal(pkg.version, '0.1.36');
    const range = manifest.supports.core;
    assert.equal(semver.satisfies('0.1.44', range, { includePrerelease: true }), true);
    assert.equal(semver.satisfies('0.1.43', range, { includePrerelease: true }), false);
});

test('supports.core is a concrete semver range string', () => {
    assert.equal(typeof manifest.supports?.core, 'string');
    assert.ok(semver.validRange(manifest.supports.core));
    assert.match(manifest.supports.core, />=0\.1\.44/);
});
