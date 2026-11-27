/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync, mobile (P5-A2): a reply whose `X-Acl-Stamp` differs from the stamp in the user data reads the
 * user data again, once per new stamp.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ENDPOINTS } from '@selfhelp/shared';

import {
    createAclStampWatcher,
    observeAclStampHeaders,
    readAclStamp,
    setAclStampWatcher,
} from '../../services/aclStamp.ts';

function watcher(known) {
    let invalidations = 0;
    const current = { known };
    return {
        current,
        invalidations: () => invalidations,
        watcher: createAclStampWatcher({
            known: () => current.known,
            invalidate: () => {
                invalidations += 1;
            },
        }),
    };
}

test('a stamp that differs invalidates the user data once, however many replies carry it', () => {
    const w = watcher('aaa');
    w.watcher.observe('bbb');
    w.watcher.observe('bbb');
    w.watcher.observe('bbb');
    assert.equal(w.invalidations(), 1);
});

test('the same stamp as the user data does nothing', () => {
    const w = watcher('aaa');
    w.watcher.observe('aaa');
    assert.equal(w.invalidations(), 0);
});

test('a second change reads again', () => {
    const w = watcher('aaa');
    w.watcher.observe('bbb');
    w.watcher.observe('ccc');
    assert.equal(w.invalidations(), 2);
});

test('a reply without a stamp, or without known user data, does nothing', () => {
    const w = watcher(null);
    w.watcher.observe('bbb');
    w.current.known = 'aaa';
    w.watcher.observe(null);
    w.watcher.observe('');
    assert.equal(w.invalidations(), 0);
});

test('reset allows the same stamp to be acted on again (sign-out, server switch)', () => {
    const w = watcher('aaa');
    w.watcher.observe('bbb');
    w.watcher.reset();
    w.watcher.observe('bbb');
    assert.equal(w.invalidations(), 2);
});

test('the stamp is read from plain headers and from AxiosHeaders-like objects', () => {
    assert.equal(readAclStamp({ 'x-acl-stamp': 'abc' }), 'abc');
    assert.equal(readAclStamp({ get: (name) => (name.toLowerCase() === 'x-acl-stamp' ? 'def' : undefined) }), 'def');
    assert.equal(readAclStamp({}), null);
    assert.equal(readAclStamp(undefined), null);
});

test('the reply of the user-data read itself is not looked at', () => {
    const w = watcher('aaa');
    setAclStampWatcher(w.watcher);
    try {
        observeAclStampHeaders({ 'x-acl-stamp': 'bbb' }, `${ENDPOINTS.AUTH.USER_DATA}?x=1`);
        assert.equal(w.invalidations(), 0);
        observeAclStampHeaders({ 'x-acl-stamp': 'bbb' }, '/pages/home');
        assert.equal(w.invalidations(), 1);
    } finally {
        setAclStampWatcher(null);
    }
});
