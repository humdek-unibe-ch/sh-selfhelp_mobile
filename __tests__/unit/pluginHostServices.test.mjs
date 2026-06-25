/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Host-side plugin contract tests for the SurveyJS mobile renderer.
 *
 * Two deterministic guards (no Expo native chain, so they run under
 * `node --test`):
 *   1. The host's `@selfhelp/shared/plugin-sdk` exposes the mobile
 *      host-services bridge (set/get singleton) at the bumped renderer
 *      contract `0.3.0` — this is the surface the SurveyJS WebView shell calls
 *      to perform authenticated requests AND (new in 0.3.0) the optional
 *      `navigate()` a plugin uses to route an in-content redirect through the
 *      host router instead of the embedded iframe. A stale shared copy would
 *      silently break the plugin, so we assert it here.
 *   2. The curated web-preview snapshot bundles SurveyJS at the expected
 *      versions and advertises `mobileRendererVersion: 0.3.0`, so the
 *      `selfhelp-mobile-preview` image renders the survey natively (RN-on-web)
 *      instead of falling back to OpenOnWebFallback.
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
} from '@selfhelp/shared/plugin-sdk';
import { MOBILE_RENDERER_VERSION, isMobileRendererCompatible } from '@selfhelp/shared/plugin-sdk';

test('host shared package exposes the mobile host-services bridge at 0.3.0', () => {
    assert.equal(MOBILE_RENDERER_VERSION, '0.3.0');
    assert.equal(isMobileRendererCompatible('^0.3.0'), true);
    // The plugin declares `compatibility.mobile: ">=0.2.0"` (host-services bridge
    // required, navigate optional); the 0.3.0 image must satisfy it.
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
    };
    setMobileHostServices(fake);
    assert.equal(getMobileHostServices(), fake);
    assert.equal(typeof getMobileHostServices().navigate, 'function');
    getMobileHostServices().navigate('impressum', false);
    assert.deepEqual(navigated, [{ target: 'impressum', external: false }]);
    setMobileHostServices(null);
    assert.equal(getMobileHostServices(), null);
});

test('web-preview snapshot bundles SurveyJS at the WebView renderer contract', () => {
    const snapshotPath = fileURLToPath(new URL('../../web-preview/preview-plugins.json', import.meta.url));
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

    assert.equal(snapshot.mobileRendererVersion, '0.3.0');
    assert.ok(Array.isArray(snapshot.plugins));

    const survey = snapshot.plugins.find((p) => p.pluginId === 'sh2-shp-survey-js');
    assert.ok(survey, 'preview snapshot must bundle the SurveyJS plugin');
    assert.equal(survey.mobilePackage, '@selfhelp/sh2-shp-survey-js-mobile');
    assert.equal(survey.version, survey.mobilePackageVersion);
    assert.match(survey.mobilePackageVersion, /^0\.3\./);
});
