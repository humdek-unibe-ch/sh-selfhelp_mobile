/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Host-side plugin contract tests for the SurveyJS mobile renderer.
 *
 * Three deterministic guards (no Expo native chain, so they run under
 * `node --test`):
 *   1. The host's `@selfhelp/shared/plugin-sdk` exposes the mobile
 *      host-services bridge (set/get singleton) at the renderer contract
 *      `0.4.0` — this is the surface the SurveyJS WebView shell calls
 *      to perform authenticated requests, the optional `navigate()` (0.3.0) a
 *      plugin uses to route an in-content redirect through the host router
 *      instead of the embedded iframe, and (new in 0.4.0) the optional `upload`,
 *      `requestPermission`, `openAppSettings` and `getPluginStorage`. A stale
 *      shared copy would silently break the plugin, so we assert it here.
 *   2. The curated web-preview snapshot bundles SurveyJS at the expected
 *      versions and advertises `mobileRendererVersion: 0.4.0`, so the
 *      `selfhelp-mobile-preview` image renders the survey natively (RN-on-web)
 *      instead of falling back to OpenOnWebFallback.
 *   3. The rules behind `upload` and `requestPermission`
 *      (`services/pluginHostBridge.ts`, pure; the device and the network are
 *      injected) hold: what is refused before anything is sent, the multipart
 *      body, the temporary files, the answer shape and the permission mapping.
 *
 * The full bridge round-trip (intent -> getApiClient -> result) is covered by
 * the plugin package's own tests; exercising it here would require the Expo
 * secure-store / axios chain the Node test runner cannot load.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
    getMobileHostServices,
    setMobileHostServices,
    MOBILE_RENDERER_VERSION,
    isMobileRendererCompatible,
} from '@selfhelp/shared/plugin-sdk';

import { toFormData } from '../../services/formRequests.ts';
import {
    ABSOLUTE_URL_ERROR,
    PLUGIN_UPLOAD_MAX_BYTES,
    base64ByteLength,
    mapPermissionAnswer,
    performHostUpload,
    requestHostPermission,
} from '../../services/pluginHostBridge.ts';

test('host shared package exposes the mobile host-services bridge at 0.4.0', async () => {
    assert.equal(MOBILE_RENDERER_VERSION, '0.4.0');
    // A caret range on 0.x no longer matches 0.4.0 (plugins declare `>=` ranges).
    assert.equal(isMobileRendererCompatible('^0.3.0'), false);
    // The plugin declares `compatibility.mobile: ">=0.2.0"` (host-services bridge
    // required, navigate optional); the 0.4.0 image must satisfy it.
    assert.equal(isMobileRendererCompatible('>=0.2.0'), true);

    assert.equal(getMobileHostServices(), null);
    const navigated = [];
    const fake = {
        apiBaseUrl: () => 'https://cms.example.com',
        getAccessToken: () => 'token',
        request: async () => ({ ok: true, status: 200, data: null }),
        // 0.3.0 host-navigation capability: the plugin feature-detects this to
        // honour an in-content redirect through the host router.
        navigate: (target, external) => navigated.push({ target, external }),
        // 0.4.0 capabilities, all optional.
        upload: async () => ({ ok: true, status: 201, data: null }),
        requestPermission: async () => 'granted',
        openAppSettings: () => undefined,
        getPluginStorage: () => ({
            getItem: async () => null,
            setItem: async () => undefined,
            removeItem: async () => undefined,
            clear: async () => undefined,
        }),
    };
    setMobileHostServices(fake);
    assert.equal(getMobileHostServices(), fake);
    assert.equal(typeof getMobileHostServices().navigate, 'function');
    getMobileHostServices().navigate('impressum', false);
    assert.deepEqual(navigated, [{ target: 'impressum', external: false }]);
    for (const name of ['upload', 'requestPermission', 'openAppSettings', 'getPluginStorage']) {
        assert.equal(typeof getMobileHostServices()[name], 'function', name);
    }
    assert.equal(await getMobileHostServices().requestPermission('microphone'), 'granted');
    setMobileHostServices(null);
    assert.equal(getMobileHostServices(), null);
});

test('web-preview snapshot bundles SurveyJS at the WebView renderer contract', () => {
    const snapshotPath = fileURLToPath(new URL('../../web-preview/preview-plugins.json', import.meta.url));
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

    assert.equal(snapshot.mobileRendererVersion, MOBILE_RENDERER_VERSION);
    assert.equal(snapshot.mobileRendererVersion, '0.4.0');
    assert.ok(Array.isArray(snapshot.plugins));

    const survey = snapshot.plugins.find((p) => p.pluginId === 'sh2-shp-survey-js');
    assert.ok(survey, 'preview snapshot must bundle the SurveyJS plugin');
    assert.equal(survey.mobilePackage, '@selfhelp/sh2-shp-survey-js-mobile');
    assert.equal(survey.version, survey.mobilePackageVersion);
    assert.match(survey.mobilePackageVersion, /^0\.3\./);
});

test('the generated plugin lock advertises the same renderer contract as the preview snapshot', () => {
    const lockPath = fileURLToPath(new URL('../../selfhelp.plugins.mobile.lock.json', import.meta.url));
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
    assert.equal(lock.mobileRendererVersion, MOBILE_RENDERER_VERSION);
});

/**
 * Deps with every call recorded. `send` answers with `answer`, or throws when it is an Error-like object.
 */
function uploadDeps(overrides = {}) {
    const log = { sent: [], materialized: [], cleaned: [], failures: [] };
    const deps = {
        materializeBase64: async (file) => {
            log.materialized.push(file);
            const uri = `file:///cache/tmp-${log.materialized.length}.bin`;
            return { uri, cleanup: () => log.cleaned.push(uri) };
        },
        sizeOfUri: async () => 1024,
        send: async (call) => {
            log.sent.push(call);
            return { status: 201, data: { status: 201, data: { id: 7 } } };
        },
        onFailure: (response) => log.failures.push(response),
        ...overrides,
    };
    return { deps, log };
}

const audioByUri = { field: 'file', name: 'answer.m4a', type: 'audio/m4a', uri: 'file:///audio/answer.m4a' };

test('upload refuses an absolute path without sending', async () => {
    const { deps, log } = uploadDeps();
    const answer = await performHostUpload({ path: 'https://evil.example/steal', files: [audioByUri] }, deps);

    assert.deepEqual(answer, { ok: false, status: 0, data: null, error: ABSOLUTE_URL_ERROR });
    assert.equal(log.sent.length, 0);
});

test('upload answers invalid_upload for no files, both or neither of uri and base64, or an incomplete file', async () => {
    const bad = [
        [],
        [{ ...audioByUri, base64: 'AAAA' }],
        [{ field: 'file', name: 'a.m4a', type: 'audio/m4a' }],
        [{ ...audioByUri, name: '' }],
        [{ ...audioByUri, field: undefined }],
    ];
    for (const files of bad) {
        const { deps, log } = uploadDeps();
        const answer = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', files }, deps);

        assert.equal(answer.ok, false);
        assert.equal(answer.status, 0);
        assert.equal(answer.reason, 'invalid_upload');
        assert.equal(log.sent.length, 0, 'nothing is sent');
        assert.equal(log.materialized.length, 0, 'nothing is written');
    }

    const { deps } = uploadDeps();
    const noList = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer' }, deps);
    assert.equal(noList.reason, 'invalid_upload');
    const wrongVerb = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', method: 'DELETE', files: [audioByUri] }, deps);
    assert.equal(wrongVerb.reason, 'invalid_upload');
});

test('upload answers file_too_large over the total limit and sends and writes nothing', async () => {
    // Base64 input: 26 MB of characters is about 19.5 MB of bytes, so use one over the 25 MB limit.
    const huge = 'A'.repeat(Math.ceil(((PLUGIN_UPLOAD_MAX_BYTES + 1024) * 4) / 3));
    const { deps, log } = uploadDeps();
    const answer = await performHostUpload(
        { path: '/cms-api/v1/plugins/x/answer', files: [{ field: 'file', name: 'big.bin', type: 'application/octet-stream', base64: huge }] },
        deps,
    );
    assert.deepEqual([answer.ok, answer.status, answer.reason], [false, 0, 'file_too_large']);
    assert.equal(log.sent.length, 0);
    assert.equal(log.materialized.length, 0);

    // The limit is one total per request: two files that fit alone do not fit together.
    const half = 'A'.repeat(Math.ceil((((PLUGIN_UPLOAD_MAX_BYTES * 0.6) | 0) * 4) / 3));
    const together = await performHostUpload(
        {
            path: '/cms-api/v1/plugins/x/answer',
            files: [
                { field: 'a', name: 'a.bin', type: 'application/octet-stream', base64: half },
                { field: 'b', name: 'b.bin', type: 'application/octet-stream', base64: half },
            ],
        },
        deps,
    );
    assert.equal(together.reason, 'file_too_large');

    // A file the plugin names by uri counts with the size the device reports.
    const { deps: bigUri, log: bigLog } = uploadDeps({ sizeOfUri: async () => PLUGIN_UPLOAD_MAX_BYTES + 1 });
    const byUri = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', files: [audioByUri] }, bigUri);
    assert.equal(byUri.reason, 'file_too_large');
    assert.equal(bigLog.sent.length, 0);

    // The text parts count too, and a small limit can be set by the host.
    const { deps: small } = uploadDeps({ maxBytes: 10 });
    const tooManyFields = await performHostUpload(
        { path: '/cms-api/v1/plugins/x/answer', fields: { note: 'x'.repeat(20) }, files: [audioByUri] },
        small,
    );
    assert.equal(tooManyFields.reason, 'file_too_large');
});

test('a valid upload sends one multipart body with the text fields and the file parts', async () => {
    const { deps, log } = uploadDeps();
    const answer = await performHostUpload(
        {
            path: '/cms-api/v1/plugins/sh2-shp-survey-js/answer',
            fields: { survey_id: '12', note: 'hello' },
            files: [audioByUri, { field: 'sketch', name: 'sketch.png', type: 'image/png', base64: 'iVBORw0KGgo=' }],
            query: { page_id: 3 },
            headers: { 'X-Plugin': 'qa' },
        },
        deps,
    );

    assert.equal(answer.ok, true);
    assert.equal(answer.status, 201);
    assert.deepEqual(answer.data, { status: 201, data: { id: 7 } });

    assert.equal(log.sent.length, 1, 'one request');
    const call = log.sent[0];
    assert.equal(call.method, 'POST', 'POST by default');
    assert.equal(call.path, '/cms-api/v1/plugins/sh2-shp-survey-js/answer');
    assert.deepEqual(call.query, { page_id: 3 });
    assert.deepEqual(call.headers, { 'X-Plugin': 'qa' });
    assert.deepEqual(call.parts, [
        { name: 'survey_id', value: '12' },
        { name: 'note', value: 'hello' },
        { name: 'file', file: { uri: 'file:///audio/answer.m4a', name: 'answer.m4a', type: 'audio/m4a' } },
        { name: 'sketch', file: { uri: 'file:///cache/tmp-1.bin', name: 'sketch.png', type: 'image/png' } },
    ]);

    // The body is built the way the core form writes build theirs.
    const form = toFormData(call.parts);
    assert.equal(form.get('survey_id'), '12');
    assert.equal(form.get('note'), 'hello');
    assert.equal(form.has('file'), true);
    assert.equal(form.has('sketch'), true);

    // Only the base64 input became a temporary file, and it was removed after the request.
    assert.deepEqual(log.materialized, [{ base64: 'iVBORw0KGgo=', name: 'sketch.png', type: 'image/png' }]);
    assert.deepEqual(log.cleaned, ['file:///cache/tmp-1.bin']);
});

test('upload honours PUT and an empty answer body', async () => {
    const { deps, log } = uploadDeps({
        send: async (call) => {
            log.sent.push(call);
            return { status: 204, data: undefined };
        },
    });
    const answer = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', method: 'PUT', files: [audioByUri] }, deps);

    assert.equal(log.sent[0].method, 'PUT');
    assert.deepEqual(answer, { ok: true, status: 204, data: null });
});

test('a 401 the host cannot recover is sessionExpired, and the temporary file is still removed', async () => {
    const { deps, log } = uploadDeps({
        send: async () => {
            throw { response: { status: 401, data: { error: 'Expired JWT Token' } }, message: 'Request failed with status code 401' };
        },
    });
    const answer = await performHostUpload(
        { path: '/cms-api/v1/plugins/x/answer', files: [{ field: 'f', name: 'a.png', type: 'image/png', base64: 'AAAA' }] },
        deps,
    );

    assert.equal(answer.ok, false);
    assert.equal(answer.status, 401);
    assert.equal(answer.sessionExpired, true);
    assert.equal(answer.error, 'Expired JWT Token');
    assert.deepEqual(log.cleaned, ['file:///cache/tmp-1.bin']);
    assert.equal(log.failures.length, 1, 'the failure is handed to the host log');
});

test('another failure carries the backend reason and is not a session problem', async () => {
    const { deps, log } = uploadDeps({
        send: async () => {
            throw { response: { status: 422, data: { reason: 'already_submitted_once', message: 'Already done' } }, message: 'x' };
        },
    });
    const answer = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', files: [audioByUri] }, deps);

    assert.equal(answer.status, 422);
    assert.equal(answer.reason, 'already_submitted_once');
    assert.equal(answer.error, 'Already done');
    assert.equal(answer.sessionExpired, false);
    assert.equal(log.failures.length, 1);

    // A request that never reached the server is status 0.
    const { deps: offline } = uploadDeps({
        send: async () => {
            throw new Error('Network Error');
        },
    });
    const none = await performHostUpload({ path: '/cms-api/v1/plugins/x/answer', files: [audioByUri] }, offline);
    assert.deepEqual([none.ok, none.status, none.error, none.sessionExpired], [false, 0, 'Network Error', false]);
});

test('a temporary file that cannot be removed does not change the answer', async () => {
    const { deps } = uploadDeps({
        materializeBase64: async () => ({
            uri: 'file:///cache/tmp.bin',
            cleanup: () => {
                throw new Error('locked');
            },
        }),
    });
    const answer = await performHostUpload(
        { path: '/cms-api/v1/plugins/x/answer', files: [{ field: 'f', name: 'a.png', type: 'image/png', base64: 'AAAA' }] },
        deps,
    );
    assert.equal(answer.ok, true);
});

test('base64ByteLength counts bytes without decoding', () => {
    assert.equal(base64ByteLength(''), 0);
    assert.equal(base64ByteLength('AAAA'), 3);
    assert.equal(base64ByteLength('AAA='), 2);
    assert.equal(base64ByteLength('AA=='), 1);
    assert.equal(base64ByteLength(btoa('hello world')), 11);
});

test('permission answers map to granted, denied (may ask again) and blocked (canAskAgain false)', async () => {
    assert.equal(mapPermissionAnswer({ granted: true, canAskAgain: true }), 'granted');
    assert.equal(mapPermissionAnswer({ granted: true, canAskAgain: false }), 'granted');
    assert.equal(mapPermissionAnswer({ granted: false, canAskAgain: true }), 'denied');
    assert.equal(mapPermissionAnswer({ granted: false, canAskAgain: false }), 'blocked');

    const asked = [];
    const askers = {
        microphone: async () => {
            asked.push('microphone');
            return { granted: false, canAskAgain: false };
        },
        camera: async () => {
            asked.push('camera');
            return { granted: true, canAskAgain: true };
        },
    };
    assert.equal(await requestHostPermission('microphone', askers), 'blocked');
    assert.equal(await requestHostPermission('camera', askers), 'granted');
    assert.deepEqual(asked, ['microphone', 'camera'], 'each kind asks through its own library call');
});

test('an unknown kind or a library that throws answers denied', async () => {
    const askers = {
        microphone: async () => {
            throw new Error('no audio module');
        },
        camera: async () => ({ granted: true, canAskAgain: true }),
    };
    assert.equal(await requestHostPermission('microphone', askers), 'denied');
    assert.equal(await requestHostPermission('location', askers), 'denied');
    assert.equal(await requestHostPermission('toString', askers), 'denied');
});
