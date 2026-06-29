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
    resolveBackendPath,
    createPreviewServer,
    DEFAULT_BASE_URL,
} from '../../web-preview/server.mjs';

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
    const backend = createServer((req, res) => {
        received.push(`${req.method} ${req.url}`);
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
    const call = (method, path) =>
        new Promise((resolvePromise, reject) => {
            const req = createRequest(origin, method, path, resolvePromise, reject);
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

        // The exchange POST is proxied.
        const exchange = await call('POST', '/mobile-preview/api/cms-api/v1/mobile-preview/session/exchange');
        assert.equal(exchange.status, 200);

        // A plugin PUBLIC submit (e.g. SurveyJS) is proxied through.
        const pluginSubmit = await call('POST', '/mobile-preview/api/cms-api/v1/plugins/surveyjs/submit');
        assert.equal(pluginSubmit.status, 200);

        // A non-allowlisted admin read is refused with 403 and never proxied.
        const admin = await call('GET', '/mobile-preview/api/cms-api/v1/admin/pages');
        assert.equal(admin.status, 403);

        // An admin plugin write is refused (admin surface stays gated).
        const adminPlugin = await call('POST', '/mobile-preview/api/cms-api/v1/admin/plugins/surveyjs/install');
        assert.equal(adminPlugin.status, 403);

        // A write to an otherwise-readable core resource is refused.
        const write = await call('POST', '/mobile-preview/api/cms-api/v1/pages');
        assert.equal(write.status, 403);

        // The backend only ever saw the allowed calls.
        assert.deepEqual(received, [
            'GET /cms-api/v1/languages',
            'POST /cms-api/v1/mobile-preview/session/exchange',
            'POST /cms-api/v1/plugins/surveyjs/submit',
        ]);
    } finally {
        await new Promise((r) => server.close(r));
        await new Promise((r) => backend.close(r));
        await rm(dist, { recursive: true, force: true });
    }
});

/** Build a node:http client request that resolves to `{ status, body }`. */
function createRequest(origin, method, path, resolvePromise, reject) {
    const url = new URL(path, origin);
    const req = httpRequest(
        { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method },
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
