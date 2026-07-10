/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression: parameterized mobile navigation must call resolve-by-path so
 * `route_params` hydrate entry-record / entry-record-form pages. Keyword-only
 * fallback is forbidden for parameterized targets. Modal/fetch paths must be
 * concrete (`/team-members/5`), never `{param}` templates from canonical_url.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const navSource = readFileSync(
    join(here, '../../components/shell/usePageNavigation.ts'),
    'utf8',
);
const utilsSource = readFileSync(
    join(here, '../../components/shell/navigationUtils.ts'),
    'utf8',
);
const deepLinkSource = readFileSync(
    join(here, '../../native/deepLinkRouting.ts'),
    'utf8',
);

/** Mirror of `concretePathAfterResolve` for a pure unit assertion. */
function concretePathAfterResolve(
    requestedPath,
    page,
) {
    const requested = requestedPath.replace(/\/+$/, '') || '/';
    for (const candidate of [page.canonical_url, page.url]) {
        if (!candidate || candidate.includes('{')) {
            continue;
        }
        return candidate.replace(/\/+$/, '') || requested;
    }
    return requested;
}

test('navigateToPage routes parameterized targets through navigateToResolvedPath', () => {
    assert.match(navSource, /isParameterizedNavigationPath\(target\)/);
    assert.match(navSource, /navigateToResolvedPath/);
    assert.match(navSource, /resolvePageByPath/);
    assert.match(navSource, /concretePathAfterResolve/);
    assert.match(
        navSource,
        /Never keyword-fallback a parameterized path/,
        'catch path must refuse keyword fallback for parameterized URLs',
    );
    assert.doesNotMatch(
        navSource,
        /canonical_url \?\? page\.url \?\? path/,
        'must not pass canonical_url templates straight to modal resolvePath',
    );
});

test('concretePathAfterResolve prefers requested path over {param} templates', () => {
    assert.equal(
        concretePathAfterResolve('/team-members/5', {
            canonical_url: '/team-members/{record_id}',
            url: '/team-members/{record_id}',
        }),
        '/team-members/5',
    );
    assert.equal(
        concretePathAfterResolve('/team-members/5/', {
            canonical_url: '/team-members/{record_id}',
            url: null,
        }),
        '/team-members/5',
    );
    assert.equal(
        concretePathAfterResolve('/about', {
            canonical_url: '/about',
            url: '/about',
        }),
        '/about',
    );
    assert.match(utilsSource, /concretePathAfterResolve/);
});

test('deep links classify multi-segment paths as resolve (not keyword)', () => {
    assert.match(deepLinkSource, /kind: 'resolve'/);
    assert.match(deepLinkSource, /segments\.length === 1/);
});
