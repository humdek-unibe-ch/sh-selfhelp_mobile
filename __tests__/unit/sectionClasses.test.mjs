/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the section class-name composer + the css_mobile
 * classifier (plan Slice 9; canonical Testing Rule for renderer helpers).
 *
 * `buildSectionClasses` is called by every container/leaf mobile style, so
 * its composition (id tag + classified css_mobile + parsed spacing + extra)
 * is a high-traffic contract. `cssMobileToUniwind` is the mobile wrapper
 * over the shared allow-list classifier; the expected outputs below mirror
 * the shared classifier's documented contract (allow / remap / drop).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSectionClasses } from '../../styles/sectionClasses.ts';
import { cssMobileToUniwind } from '../../styles/cssMobileToUniwind.ts';

test('buildSectionClasses always bakes in the style-section-{id} tag', () => {
    assert.equal(buildSectionClasses({ id: 42 }), 'style-section-42');
});

test('buildSectionClasses appends classified css_mobile classes', () => {
    // flex + mt-md allowed; mantine-fw → w-full; cursor-pointer dropped.
    const out = buildSectionClasses({ id: 1, css_mobile: 'flex mt-md mantine-fw cursor-pointer' });
    assert.equal(out, 'style-section-1 flex mt-md w-full');
});

test('buildSectionClasses parses the unified shared_spacing field into classes', () => {
    const section = {
        id: 2,
        fields: { shared_spacing: { content: '{"mt":"md","pb":"sm"}' } },
    };
    // md → 4, sm → 3 via SPACING_TO_TAILWIND.
    const classes = buildSectionClasses(section).split(' ');
    assert.ok(classes.includes('style-section-2'));
    assert.ok(classes.includes('mt-4'), `expected mt-4 in ${classes.join(' ')}`);
    assert.ok(classes.includes('pb-3'), `expected pb-3 in ${classes.join(' ')}`);
});

test('buildSectionClasses falls back to the legacy margin-only spacing field', () => {
    const section = { id: 3, fields: { web_spacing_margin: { content: '{"mt":"lg"}' } } };
    assert.ok(buildSectionClasses(section).split(' ').includes('mt-5')); // lg → 5
});

test('buildSectionClasses appends extra classes and filters falsy entries', () => {
    const out = buildSectionClasses({ id: 4 }, { extra: ['custom-a', false, undefined, null, 'custom-b'] });
    assert.equal(out, 'style-section-4 custom-a custom-b');
});

test('buildSectionClasses produces a clean single-spaced, trimmed string', () => {
    const out = buildSectionClasses({ id: 5, css_mobile: 'flex' }, { extra: ['x'] });
    assert.equal(out, out.trim());
    assert.ok(!/\s{2,}/.test(out), `unexpected double space in "${out}"`);
});

test('cssMobileToUniwind returns empty string for null / undefined / empty input', () => {
    assert.equal(cssMobileToUniwind(null), '');
    assert.equal(cssMobileToUniwind(undefined), '');
    assert.equal(cssMobileToUniwind(''), '');
});

test('cssMobileToUniwind allows, remaps, and drops per the shared contract', () => {
    assert.equal(
        cssMobileToUniwind('flex mt-md mantine-fw cursor-pointer grid-cols-7 w-[120px]'),
        'flex mt-md w-full w-[120px]',
    );
});

test('cssMobileToUniwind drops a string of fully-unsupported classes', () => {
    assert.equal(cssMobileToUniwind('cursor-pointer grid-cols-7'), '');
});

test('cssMobileToUniwind remaps standard Tailwind colour scale to the Mantine hex scale', () => {
    // The web dropdown offers oklch-based Tailwind classes (bg-blue-500); RN
    // can only paint the hex-backed Mantine scale (bg-blue-6), so the shared
    // remap must rewrite the author's pick. 500 -> 6, 100 -> 1.
    assert.equal(cssMobileToUniwind('bg-blue-500'), 'bg-blue-6');
    assert.equal(cssMobileToUniwind('bg-green-500'), 'bg-green-6');
    assert.equal(cssMobileToUniwind('bg-red-500'), 'bg-red-6');
    assert.equal(cssMobileToUniwind('bg-indigo-500'), 'bg-indigo-6');
    assert.equal(cssMobileToUniwind('bg-gray-100'), 'bg-gray-1');
    assert.equal(cssMobileToUniwind('bg-teal-100'), 'bg-teal-1');
});

test('cssMobileToUniwind aliases Tailwind-only colour names onto Mantine names', () => {
    // purple/fuchsia have no Mantine scale; alias them to grape so the author's
    // dropdown pick still renders instead of being dropped.
    assert.equal(cssMobileToUniwind('bg-purple-500'), 'bg-grape-6');
});

test('cssMobileToUniwind allows text-white / text-black for on-colour copy', () => {
    assert.equal(cssMobileToUniwind('text-white'), 'text-white');
    assert.equal(cssMobileToUniwind('text-black'), 'text-black');
});

test('cssMobileToUniwind drops web-only interactive (hover/focus) state classes', () => {
    assert.equal(cssMobileToUniwind('hover:bg-blue-600 focus:ring-2'), '');
});

test('cssMobileToUniwind keeps a realistic css demo spread renderable on mobile', () => {
    // The showcase "css / css_mobile demo" sections use exactly this kind of
    // spread; every token must survive (remapped where needed) so the colour
    // actually paints on Expo/RN.
    assert.equal(
        cssMobileToUniwind('bg-blue-500 text-white rounded-lg shadow-md p-4'),
        'bg-blue-6 text-white rounded-lg shadow-md p-4',
    );
});
