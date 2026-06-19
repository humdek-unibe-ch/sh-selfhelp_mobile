/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the functional form-control value/validation contracts
 * (mobile rendering plan 11.6 — slider, range-slider, file-input are no longer
 * placeholders). The RN components on top (`Slider`, `RangeSlider`,
 * `FileInput`) wrap HeroUI Native / expo-image-picker, which cannot load under
 * `node --test`; these tests lock the pure parsing/serialisation/validation
 * logic those components depend on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    clampNumber,
    parseSliderValue,
    parseRangeValue,
    serializeRangeValue,
} from '../../components/styles/forms/_sliderValue.ts';
import {
    parseAcceptList,
    fileMatchesAccept,
    validateFile,
} from '../../components/styles/forms/_fileValidation.ts';

test('clampNumber keeps values inside [min,max] and floors NaN to min', () => {
    assert.equal(clampNumber(5, 0, 10), 5);
    assert.equal(clampNumber(-3, 0, 10), 0);
    assert.equal(clampNumber(99, 0, 10), 10);
    assert.equal(clampNumber(Number.NaN, 2, 10), 2);
});

test('parseSliderValue parses and clamps, defaulting to min', () => {
    assert.equal(parseSliderValue('42', 0, 100), 42);
    assert.equal(parseSliderValue('999', 0, 100), 100);
    assert.equal(parseSliderValue('', 5, 100), 5);
    assert.equal(parseSliderValue(undefined, 5, 100), 5);
    assert.equal(parseSliderValue('not-a-number', 5, 100), 5);
});

test('parseRangeValue returns an ordered, clamped [low,high] pair', () => {
    assert.deepEqual(parseRangeValue('20,80', 0, 100), [20, 80]);
    // out-of-order input is normalised
    assert.deepEqual(parseRangeValue('80,20', 0, 100), [20, 80]);
    // clamped to range
    assert.deepEqual(parseRangeValue('-5,150', 0, 100), [0, 100]);
    // empty defaults to full span
    assert.deepEqual(parseRangeValue('', 10, 90), [10, 90]);
    // single value collapses high to max
    assert.deepEqual(parseRangeValue('30', 0, 100), [30, 100]);
});

test('serializeRangeValue round-trips with parseRangeValue', () => {
    const pair = parseRangeValue('25,75', 0, 100);
    const serialized = serializeRangeValue(pair);
    assert.equal(serialized, '25,75');
    assert.deepEqual(parseRangeValue(serialized, 0, 100), [25, 75]);
});

test('parseAcceptList splits extensions and mime patterns', () => {
    const list = parseAcceptList('image/*,.pdf, .PNG ,application/json');
    assert.deepEqual(list.mimePatterns, ['image/*', 'application/json']);
    assert.deepEqual(list.extensions, ['pdf', 'png']);
    const empty = parseAcceptList(undefined);
    assert.deepEqual(empty.extensions, []);
    assert.deepEqual(empty.mimePatterns, []);
});

test('fileMatchesAccept matches by extension or mime wildcard; empty = allow any', () => {
    const list = parseAcceptList('image/*,.pdf');
    assert.equal(fileMatchesAccept({ name: 'a.png', mimeType: 'image/png' }, list), true);
    assert.equal(fileMatchesAccept({ name: 'doc.pdf', mimeType: 'application/pdf' }, list), true);
    assert.equal(fileMatchesAccept({ name: 'note.txt', mimeType: 'text/plain' }, list), false);
    // empty accept list allows anything
    assert.equal(fileMatchesAccept({ name: 'note.txt', mimeType: 'text/plain' }, parseAcceptList('')), true);
});

test('validateFile enforces accept and max-size before upload', () => {
    assert.deepEqual(
        validateFile({ name: 'a.png', size: 1000, mimeType: 'image/png' }, { accept: 'image/*', maxSizeBytes: 5000 }),
        { ok: true },
    );
    assert.equal(
        validateFile({ name: 'a.txt', mimeType: 'text/plain' }, { accept: 'image/*' }).ok,
        false,
    );
    assert.equal(
        validateFile({ name: 'a.png', size: 9000, mimeType: 'image/png' }, { accept: 'image/*', maxSizeBytes: 5000 }).ok,
        false,
    );
    // no constraints => always ok
    assert.deepEqual(validateFile({ name: 'whatever.bin', size: 999999 }, {}), { ok: true });
});
