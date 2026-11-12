/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Coverage for the `selfhelp-mobile-preview` static + reverse-proxy server.
 *
 * The proxy is the ONLY bridge from the public preview to the private backend,
 * so its allowlist is security-critical. We test the pure decision helpers
 * (`isProxyAllowed`, `resolveBackendPath`) plus a black-box boot: a real
 * preview server in front of a fake backend asserting that allowed reads are
 * proxied, the exchange POST is proxied, and everything else (writes, admin
 * reads, non-API non-static paths) is refused without ever reaching the backend.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    isProxyAllowed,
    isPluginPublicRoute,
    isAssetRoute,
    resolveBackendPath,
    createPreviewServer,
    DEFAULT_BASE_URL,
    ALLOWED_FORM_ROUTES,
    ALLOWED_GET_EXACT,
} from '../../web-preview/server.mjs';

const ASSET_UUID = '3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c';

test('isProxyAllowed permits only allowlisted GET reads', () => {
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/languages'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/pages/by-keyword/home'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/plugins/manifest'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/auth/user-data'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/pages?language=2'), true);
});

test('isProxyAllowed refuses writes, admin reads, and prefix look-alikes', () => {
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/admin/pages'), false);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/pages'), false);
    assert.equal(isProxyAllowed('DELETE', '/cms-api/v1/pages/5'), false);
    // Prefix boundary: a path that merely starts with an allowed token must not slip through.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/pages-secret'), false);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/languages-internal'), false);
});

test('isProxyAllowed permits the navigation payload exactly as written', () => {
    // The drawer/bottom-tab menus come from it; without it the shell is modal-only.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/navigation'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/navigation?language_id=2'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/navigation/anything'), false);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/navigation-secret'), false);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/navigation'), false);
    assert.deepEqual(ALLOWED_GET_EXACT, ['/cms-api/v1/navigation']);
});

test('isProxyAllowed permits the uploaded-asset route by UUID and nothing around it', () => {
    // The app sends the previewed user's bearer token; the backend decides who sees a restricted asset.
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/assets/${ASSET_UUID}`), true);
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/assets/${ASSET_UUID}?v=2`), true);
    assert.equal(isAssetRoute(`/cms-api/v1/assets/${ASSET_UUID}`), true);

    // No listing, no other shape of id, no path tricks, no look-alikes.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/assets'), false);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/assets/'), false);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/assets/not-a-uuid'), false);
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/assets/${ASSET_UUID}/extra`), false);
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/assets/${ASSET_UUID.toUpperCase()}`), false);
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/assets/../admin/pages'), false);
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/assets-secret/${ASSET_UUID}`), false);
    assert.equal(isProxyAllowed('GET', `/cms-api/v1/admin/assets/${ASSET_UUID}`), false);
    assert.equal(isAssetRoute('/cms-api/v1/assets'), false);

    // Read only.
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        assert.equal(isProxyAllowed(method, `/cms-api/v1/assets/${ASSET_UUID}`), false, method);
    }
});

test('isProxyAllowed permits only the one-time-code exchange POST', () => {
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/mobile-preview/session/exchange'), true);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/auth/login'), false);
});

test('isProxyAllowed forwards plugin PUBLIC runtime routes for any method', () => {
    // SurveyJS runtime: load the published survey, autosave progress, submit.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/plugins/surveyjs/published?section=5'), true);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/plugins/surveyjs/submit'), true);
    assert.equal(isProxyAllowed('PUT', '/cms-api/v1/plugins/surveyjs/progress'), true);
    assert.equal(isProxyAllowed('GET', '/cms-api/v2/plugins/anything'), true);
    // The permission-gated admin plugin surface must NOT slip through.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/admin/plugins/surveyjs/config'), false);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/admin/plugins/surveyjs/install'), false);
});

test('isProxyAllowed permits core form routes only with their declared methods', () => {
    // A previewed page's core forms can be submitted/updated/deleted, mirroring
    // the backend MobilePreviewAccessGuard so forms are testable in preview.
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/forms/submit'), true);
    assert.equal(isProxyAllowed('PUT', '/cms-api/v1/forms/update'), true);
    assert.equal(isProxyAllowed('DELETE', '/cms-api/v1/forms/delete'), true);
    // The method must match the declared one; a mismatched method is refused.
    assert.equal(isProxyAllowed('GET', '/cms-api/v1/forms/submit'), false);
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/forms/delete'), false);
    // A non-form core write look-alike is still refused.
    assert.equal(isProxyAllowed('POST', '/cms-api/v1/forms/other'), false);
    // The exported allowlist is exactly the three core form routes.
    assert.deepEqual(ALLOWED_FORM_ROUTES, {
        '/cms-api/v1/forms/submit': 'POST',
        '/cms-api/v1/forms/update': 'PUT',
        '/cms-api/v1/forms/delete': 'DELETE',
    });
});

test('isPluginPublicRoute matches public plugin routes but never admin plugin routes', () => {
    assert.equal(isPluginPublicRoute('/cms-api/v1/plugins/surveyjs/submit'), true);
    assert.equal(isPluginPublicRoute('/cms-api/v1/plugins/manifest'), true);
    assert.equal(isPluginPublicRoute('/cms-api/v1/admin/plugins/surveyjs'), false);
    assert.equal(isPluginPublicRoute('/cms-api/v1/pages'), false);
});

test('resolveBackendPath strips the base/api prefix or returns null', () => {
    assert.equal(
        resolveBackendPath('/mobile-preview/api/cms-api/v1/languages', '/mobile-preview'),
        '/cms-api/v1/languages',
    );
    assert.equal(
        resolveBackendPath('/mobile-preview/api/cms-api/v1/pages?x=1', '/mobile-preview'),
        '/cms-api/v1/pages?x=1',
    );
    // Non-API static path → not a proxy request.
    assert.equal(resolveBackendPath('/mobile-preview/index.html', '/mobile-preview'), null);
    assert.equal(resolveBackendPath('/some/other', '/mobile-preview'), null);
});

test('boot: static, version, health, allowlist proxy, and refusals', async () => {
    // --- Fake backend: records the paths it actually receives. ---
    const received = [];
    let assetAuthorization = null;
    const backend = createServer((req, res) => {
        received.push(`${req.method} ${req.url}`);
        if (req.url?.startsWith('/cms-api/v1/assets/')) assetAuthorization = req.headers.authorization ?? null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: req.url }));
    });
    await new Promise((r) => backend.listen(0, '127.0.0.1', r));
    const backendUrl = `http://127.0.0.1:${backend.address().port}`;

    // --- Dist dir with an index.html + a CI-style version.json. ---
    const dist = await mkdtemp(join(tmpdir(), 'sh-preview-'));
    await writeFile(join(dist, 'index.html'), '<!doctype html><title>preview</title>', 'utf-8');
    await writeFile(
        join(dist, 'version.json'),
        JSON.stringify({ version: '0.2.0', mobileRendererVersion: '0.1.0', bundledPlugins: [] }),
        'utf-8',
    );

    const server = createPreviewServer({ distDir: dist, backendUrl, baseUrl: DEFAULT_BASE_URL });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const origin = `http://127.0.0.1:${server.address().port}`;

    /** Minimal fetch-like helper over node:http. */
    const call = (method, path, headers) =>
        new Promise((resolvePromise, reject) => {
            const req = createRequest(origin, method, path, resolvePromise, reject, headers);
            req.end();
        });

    try {
        const health = await call('GET', '/mobile-preview/healthz');
        assert.equal(health.status, 200);
        assert.deepEqual(JSON.parse(health.body), { status: 'ok' });

        const version = await call('GET', '/mobile-preview/version.json');
        assert.equal(version.status, 200);
        assert.equal(JSON.parse(version.body).mobileRendererVersion, '0.1.0');

        const index = await call('GET', '/mobile-preview/');
        assert.equal(index.status, 200);
        assert.match(index.body, /preview/);

        // SPA fallback: unknown client route serves index.html.
        const spa = await call('GET', '/mobile-preview/some/deep/route');
        assert.equal(spa.status, 200);
        assert.match(spa.body, /preview/);

        // Allowlisted read is proxied through to the backend.
        const langs = await call('GET', '/mobile-preview/api/cms-api/v1/languages');
        assert.equal(langs.status, 200);
        assert.equal(JSON.parse(langs.body).path, '/cms-api/v1/languages');

        // The navigation payload is proxied so the menus render.
        const navigation = await call('GET', '/mobile-preview/api/cms-api/v1/navigation?language_id=2');
        assert.equal(navigation.status, 200);

        // An uploaded asset is proxied WITH the caller's bearer token, so the
        // backend can decide whether the previewed user may see it.
        const asset = await call('GET', `/mobile-preview/api/cms-api/v1/assets/${ASSET_UUID}`, {
            Authorization: 'Bearer preview-token',
        });
        assert.equal(asset.status, 200);
        assert.equal(assetAuthorization, 'Bearer preview-token');

        // The exchange POST is proxied.
        const exchange = await call('POST', '/mobile-preview/api/cms-api/v1/mobile-preview/session/exchange');
        assert.equal(exchange.status, 200);

        // A plugin PUBLIC submit (e.g. SurveyJS) is proxied through.
        const pluginSubmit = await call('POST', '/mobile-preview/api/cms-api/v1/plugins/surveyjs/submit');
        assert.equal(pluginSubmit.status, 200);

        // A core form submit is proxied through so forms are testable in preview.
        const formSubmit = await call('POST', '/mobile-preview/api/cms-api/v1/forms/submit');
        assert.equal(formSubmit.status, 200);

        // A non-allowlisted admin read is refused with 403 and never proxied.
        const admin = await call('GET', '/mobile-preview/api/cms-api/v1/admin/pages');
        assert.equal(admin.status, 403);

        // An admin plugin write is refused (admin surface stays gated).
        const adminPlugin = await call('POST', '/mobile-preview/api/cms-api/v1/admin/plugins/surveyjs/install');
        assert.equal(adminPlugin.status, 403);

        // A write to an otherwise-readable core resource is refused.
        const write = await call('POST', '/mobile-preview/api/cms-api/v1/pages');
        assert.equal(write.status, 403);

        // Assets are reachable by UUID only: a listing or another id shape is refused.
        const assetListing = await call('GET', '/mobile-preview/api/cms-api/v1/assets');
        assert.equal(assetListing.status, 403);
        const assetOther = await call('GET', '/mobile-preview/api/cms-api/v1/assets/not-a-uuid');
        assert.equal(assetOther.status, 403);

        // The backend only ever saw the allowed calls.
        assert.deepEqual(received, [
            'GET /cms-api/v1/languages',
            'GET /cms-api/v1/navigation?language_id=2',
            `GET /cms-api/v1/assets/${ASSET_UUID}`,
            'POST /cms-api/v1/mobile-preview/session/exchange',
            'POST /cms-api/v1/plugins/surveyjs/submit',
            'POST /cms-api/v1/forms/submit',
        ]);
    } finally {
        await new Promise((r) => server.close(r));
        await new Promise((r) => backend.close(r));
        await rm(dist, { recursive: true, force: true });
    }
});

/** Build a node:http client request that resolves to `{ status, body }`. */
function createRequest(origin, method, path, resolvePromise, reject, headers) {
    const url = new URL(path, origin);
    const req = httpRequest(
        { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
        (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => resolvePromise({ status: res.statusCode, body }));
        },
    );
    req.on('error', reject);
    return req;
}
