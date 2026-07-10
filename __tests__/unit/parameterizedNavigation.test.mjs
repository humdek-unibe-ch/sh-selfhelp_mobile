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
const deepLinkRoutingSource = readFileSync(
    join(here, '../../native/deepLinkRouting.ts'),
    'utf8',
);
const deepLinksSource = readFileSync(
    join(here, '../../native/deepLinks.ts'),
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
    assert.match(
        navSource,
        /Alert\.alert\(/,
        'parameterized resolve failure must surface an explicit error',
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
    assert.match(deepLinkRoutingSource, /kind: 'resolve'/);
    assert.match(deepLinkRoutingSource, /segments\.length === 1/);
});

test('deepLinks resolve case uses navigateToResolvedPath (no keyword fallback)', () => {
    assert.match(deepLinksSource, /navigateToResolvedPath/);
    assert.match(
        deepLinksSource,
        /case 'resolve':[\s\S]*navigateToResolvedPath\(plan\.path\)/,
    );
    assert.doesNotMatch(
        deepLinksSource,
        /router\.push\(`\/\$\{first\}`\)/,
        'must not keyword-fallback a failed parameterized deep link',
    );
    assert.doesNotMatch(
        deepLinksSource,
        /canonical_url \?\? page\.url/,
        'must not route via canonical_url templates after resolve',
    );
});

test('entry-record and entry-record-form parameterized opens require path resolve', () => {
    // Both styles hydrate from backend section_data only when /pages/resolve
    // receives the concrete path (load_record_from + route_params).
    assert.match(navSource, /resolvePageByPath/);
    assert.match(navSource, /isParameterizedNavigationPath/);
    assert.match(navSource, /navigateToResolvedPath/);
});
