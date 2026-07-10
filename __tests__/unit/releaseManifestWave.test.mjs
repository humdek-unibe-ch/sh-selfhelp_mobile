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

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const manifest = JSON.parse(readFileSync(join(root, 'release-manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('supports.core requires >=0.1.36 (authoritative vs package version)', () => {
    assert.equal(manifest.kind, 'mobile-preview');
    assert.equal(manifest.supports.core, '>=0.1.36 <0.2.0');
});

test('pins @selfhelp/shared to 1.21.6', () => {
    assert.equal(pkg.dependencies['@selfhelp/shared'], '1.21.6');
});
