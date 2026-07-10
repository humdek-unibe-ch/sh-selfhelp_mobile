/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile defensive CMS-surface guard (backend is primary authority).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const usePageContent = readFileSync(
    join(here, '../../hooks/usePageContent.ts'),
    'utf8',
);
const usePageNavigation = readFileSync(
    join(here, '../../components/shell/usePageNavigation.ts'),
    'utf8',
);

test('usePageContent rejects page_surface=cms', () => {
    assert.match(usePageContent, /page_surface === 'cms'/);
    assert.match(usePageContent, /CMS-surface pages are not available/);
});

test('navigateToResolvedPath skips page_surface=cms', () => {
    assert.match(usePageNavigation, /page_surface === 'cms'/);
});
