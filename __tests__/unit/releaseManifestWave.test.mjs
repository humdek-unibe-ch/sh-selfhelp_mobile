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

test('supports.core requires >=0.1.36 (authoritative vs package version)', () => {
    assert.equal(manifest.kind, 'mobile-preview');
    assert.equal(manifest.supports.core, '>=0.1.36 <0.2.0');
});

test('pins @selfhelp/shared to 1.21.7 (should_fallback; not staged 2.x/3.x)', () => {
    assert.equal(pkg.dependencies['@selfhelp/shared'], '1.21.7');
    assert.notEqual(
        pkg.version,
        '0.1.36',
        'package SemVer need not match core; supports.core is authoritative',
    );
});

test('mobile package 0.1.33 + supports.core accepts core 0.1.36 and rejects 0.1.35', () => {
    assert.equal(pkg.version, '0.1.33');
    const range = manifest.supports.core;
    assert.equal(semver.satisfies('0.1.36', range, { includePrerelease: true }), true);
    assert.equal(semver.satisfies('0.1.35', range, { includePrerelease: true }), false);
});

test('supports.core is a concrete semver range string', () => {
    assert.equal(typeof manifest.supports?.core, 'string');
    assert.ok(semver.validRange(manifest.supports.core));
    assert.match(manifest.supports.core, />=0\.1\.36/);
});
