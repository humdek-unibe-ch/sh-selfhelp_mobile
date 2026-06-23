/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the mobile Avatar `initialsFromName` helper (style polish wave:
 * the `name` field now auto-derives initials, mirroring the web Mantine `name`
 * behaviour). Pins the word-splitting + two-letter clamp + upper-casing so the
 * mobile fallback text matches author expectations across odd inputs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { initialsFromName } from '../../components/styles/interactive/avatarInitials.ts';

test('initialsFromName takes the first letter of the first two words', () => {
    assert.equal(initialsFromName('Quality Assurance'), 'QA');
    assert.equal(initialsFromName('Ada Lovelace'), 'AL');
});

test('initialsFromName clamps to two initials for longer names', () => {
    assert.equal(initialsFromName('John Ronald Reuel Tolkien'), 'JR');
});

test('initialsFromName handles a single word', () => {
    assert.equal(initialsFromName('Madonna'), 'M');
});

test('initialsFromName collapses extra whitespace and upper-cases', () => {
    assert.equal(initialsFromName('  ada   lovelace  '), 'AL');
});

test('initialsFromName returns empty string for blank input', () => {
    assert.equal(initialsFromName('   '), '');
    assert.equal(initialsFromName(''), '');
});
