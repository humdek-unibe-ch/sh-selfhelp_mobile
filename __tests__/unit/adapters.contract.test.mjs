/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile UI adapter composition contract (mobile rendering plan, section 9.2):
 *
 *   effective adapter = open-source base + available Pro overrides
 *
 * Verified RN-free against the pure `composeMobileAdapters` helper. The OSS
 * adapter set itself wraps `heroui-native`/React Native (not loadable under
 * `node --test`); that the OSS + Pro sets implement EVERY contract capability is
 * enforced by the typecheck (`ossAdapters`/`proAdapters: IMobileUiAdapters`) and
 * the app-side Pro typecheck (`tsconfig.pro.json`), plus the renderer tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { composeMobileAdapters } from '@/components/ui/adapters/compose';

/** The milestone-one adapter capability set (keep in sync with IMobileUiAdapters). */
const CONTRACT_CAPABILITIES = [
    'MobileButton',
    'MobileText',
    'MobileContainer',
    'MobileCard',
    'MobileInput',
    'MobileTextarea',
    'MobileSwitch',
    'MobileCheckbox',
    'MobileSelect',
    'MobileModal',
];

function fakeAdapterSet(tag) {
    return Object.fromEntries(
        CONTRACT_CAPABILITIES.map((cap) => [cap, function impl() { return `${tag}:${cap}`; }]),
    );
}

test('no overrides returns the base set unchanged (pure OSS build)', () => {
    const base = fakeAdapterSet('oss');
    assert.equal(composeMobileAdapters(base), base);
    assert.deepEqual(composeMobileAdapters(base, {}), base);
});

test('a partial Pro override replaces only that capability; the rest fall back to OSS', () => {
    const base = fakeAdapterSet('oss');
    const ProButton = function ProButton() { return 'pro:MobileButton'; };
    const active = composeMobileAdapters(base, { MobileButton: ProButton });

    assert.equal(active.MobileButton, ProButton, 'overridden capability wins');
    assert.equal(active.MobileCard, base.MobileCard, 'non-overridden capability falls back to OSS');
    assert.equal(active.MobileSelect, base.MobileSelect, 'non-overridden capability falls back to OSS');
    for (const cap of CONTRACT_CAPABILITIES) {
        assert.equal(typeof active[cap], 'function', `every capability still present: ${cap}`);
    }
});

test('an undefined override never erases the OSS fallback (plan 6.3 / 9.2)', () => {
    const base = fakeAdapterSet('oss');
    const active = composeMobileAdapters(base, { MobileButton: undefined, MobileCard: undefined });
    assert.equal(active.MobileButton, base.MobileButton);
    assert.equal(active.MobileCard, base.MobileCard);
});

test('a full Pro override set replaces every capability', () => {
    const base = fakeAdapterSet('oss');
    const pro = fakeAdapterSet('pro');
    const active = composeMobileAdapters(base, pro);
    for (const cap of CONTRACT_CAPABILITIES) {
        assert.equal(active[cap], pro[cap], cap);
    }
});
