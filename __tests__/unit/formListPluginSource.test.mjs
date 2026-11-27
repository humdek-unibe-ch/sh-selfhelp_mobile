/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * A record version written by a plugin (revision source `plugin`) reads
 * "via plugin" in the form list history line.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { describeRevision, SOURCE_WORDS } from '../../components/styles/composite/FormList/FormList.logic.ts';

const revision = (source) => ({
    operation: 'update',
    source,
    actor: { id: 7, name: 'Ada' },
    impersonated_by: null,
    restored_from_version: null,
});

test('a plugin write is named "via plugin" and the other sources keep their words', () => {
    assert.equal(SOURCE_WORDS.plugin, 'plugin');
    assert.equal(describeRevision(revision('plugin')), 'Updated by Ada via plugin');
    assert.equal(describeRevision(revision('form')), 'Updated by Ada via form');
    assert.equal(describeRevision(revision('quick_action')), 'Updated by Ada via quick action');
});
