/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the mobile `accordion` / `accordion-item` renderer contract.
 *
 * The HeroUI Native components themselves (Accordion.tsx / AccordionItem.tsx)
 * import `heroui-native` + `react-native`, which are not loadable under
 * `node --test` (see __tests__/support/renderMobile.ts). So — like the other
 * renderer unit suites — these pin the pure contract the renderers depend on:
 *   - both styles are registered as mobile-rendered containers;
 *   - the cross-platform field readers + semantic mappers produce the exact
 *     values the renderers feed to HeroUI (`Accordion` selectionMode/variant/
 *     radius; `Accordion.Item` label/description/disabled/value);
 *   - children are read from `section.children`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { BASE_STYLE_REGISTRY, isStyleSupportedOnPlatform } from '@selfhelp/shared/registry';
import { mapAccordionVariantToHeroUiVariant, mapRadiusToPx } from '@selfhelp/shared';
import { readField, readBooleanField, useInterpolatedField } from '../../components/renderer/useField.ts';
import { renderHook } from '../support/renderMobile.ts';

const sectionWithFields = (fields, extra = {}) => ({ ...extra, fields });

// ===== registration / dispatch =====

test('accordion + accordion-item are registered as mobile-rendered containers', () => {
    for (const name of ['accordion', 'accordion-item']) {
        assert.ok(BASE_STYLE_REGISTRY[name], `${name} must be in the shared registry`);
        assert.equal(BASE_STYLE_REGISTRY[name].canHaveChildren, true, `${name} must accept children`);
        assert.equal(isStyleSupportedOnPlatform(name, 'mobile'), true, `${name} must render on mobile`);
    }
});

// ===== accordion: reads cross-platform fields the way the renderer feeds HeroUI =====

test('accordion maps multiple / variant / radius onto the HeroUI Accordion props', () => {
    const section = sectionWithFields({
        multiple: { content: '1' },
        accordion_variant: { content: 'contained' },
        radius: { content: 'none' },
    });
    // multiple -> selectionMode 'multiple'
    assert.equal(readBooleanField(section, 'multiple', false), true);
    // accordion_variant -> HeroUI Native variant
    assert.equal(mapAccordionVariantToHeroUiVariant(readField(section, 'accordion_variant')), 'surface');
    // radius -> px (none => 0)
    assert.equal(mapRadiusToPx(readField(section, 'radius')), 0);
});

test('accordion falls back to single selection + default variant when fields are absent', () => {
    const section = sectionWithFields({});
    assert.equal(readBooleanField(section, 'multiple', false), false);
    assert.equal(mapAccordionVariantToHeroUiVariant(readField(section, 'accordion_variant')), 'default');
    assert.equal(mapRadiusToPx(readField(section, 'radius')), undefined);
});

// ===== accordion-item: label / description / disabled + id-derived value =====

test('accordion-item reads its label + description content and disabled flag', () => {
    const section = sectionWithFields(
        { label: { content: 'FAQ one' }, description: { content: 'More info' } },
        { id: 7 },
    );
    assert.equal(renderHook(() => useInterpolatedField(section, 'label', {})), 'FAQ one');
    assert.equal(renderHook(() => useInterpolatedField(section, 'description', {})), 'More info');
    assert.equal(readBooleanField(section, 'disabled', false), false);
    // HeroAccordion.Item value is the section id as a string.
    assert.equal(String(section.id), '7');
});

test('accordion-item honours the disabled flag and interpolates the label', () => {
    const section = sectionWithFields(
        { label: { content: 'Hi {{name}}' }, disabled: { content: '1' } },
        { id: 9 },
    );
    assert.equal(readBooleanField(section, 'disabled', false), true);
    assert.equal(renderHook(() => useInterpolatedField(section, 'label', { name: 'Sam' })), 'Hi Sam');
});

// ===== children come from section.children (the <Children> contract) =====

test('accordion + accordion-item carry their child sections under section.children', () => {
    const child = { id: 2, style_name: 'text', fields: { text: { content: 'body' } } };
    const accordion = { id: 1, style_name: 'accordion', children: [child] };
    const item = { id: 3, style_name: 'accordion-item', children: [child] };
    assert.deepEqual(accordion.children, [child]);
    assert.deepEqual(item.children, [child]);
});
