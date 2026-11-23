/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync, mobile (P5-A3, P5-A4): the bootstrap of the stream (a guest listens to the public topic),
 * the merge and delay of the messages, and when the stream runs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createSyncDispatcher,
    needsCatchUp,
    parseBootstrap,
    shouldStream,
    streamTopics,
    subscribeUrl,
} from '../../services/syncStream.ts';

const message = (tags) => JSON.stringify({ v: 1, tags });

function harness(rebootstrapOn = 'acl') {
    const applied = [];
    let rebootstraps = 0;
    const timers = [];
    const dispatcher = createSyncDispatcher({
        apply: (tags) => {
            applied.push([...tags]);
            return { rebootstrap: tags.includes(rebootstrapOn) };
        },
        onRebootstrap: () => {
            rebootstraps += 1;
        },
        delayMs: () => 120,
        setTimer: (callback, ms) => {
            timers.push({ callback, ms, cleared: false });
            return timers.length - 1;
        },
        clearTimer: (handle) => {
            timers[handle].cleared = true;
        },
    });
    return { dispatcher, applied, timers, rebootstraps: () => rebootstraps };
}

test('a guest bootstrap names only the public topic and no private one', () => {
    const bootstrap = parseBootstrap({
        hubUrl: 'https://hub.test/.well-known/mercure',
        topic: null,
        syncTopics: ['sync/public'],
        token: null,
        expiresIn: 600,
    });
    assert.deepEqual(streamTopics(bootstrap), ['sync/public']);
    assert.equal(bootstrap.token, null);
    assert.equal(subscribeUrl(bootstrap), 'https://hub.test/.well-known/mercure?topic=sync%2Fpublic');
});

test('a signed-in bootstrap subscribes to every sync topic once', () => {
    const bootstrap = parseBootstrap({
        hubUrl: 'https://hub.test/h?x=1',
        topic: 'acl/users/4',
        syncTopics: ['sync/users/4', 'sync/groups/2', 'sync/public', 'sync/public'],
        token: 'jwt',
    });
    assert.deepEqual(streamTopics(bootstrap), ['sync/users/4', 'sync/groups/2', 'sync/public']);
    assert.equal(
        subscribeUrl(bootstrap),
        'https://hub.test/h?x=1&topic=sync%2Fusers%2F4&topic=sync%2Fgroups%2F2&topic=sync%2Fpublic',
    );
});

test('an older core with only a private topic still streams it', () => {
    const bootstrap = parseBootstrap({ hubUrl: 'https://hub.test/h', topic: 'acl/users/4', token: 'jwt' });
    assert.deepEqual(streamTopics(bootstrap), ['acl/users/4']);
});

test('a bootstrap without hub or topic is unusable', () => {
    assert.equal(parseBootstrap(null), null);
    assert.equal(parseBootstrap({ topic: 't' }), null);
    assert.equal(parseBootstrap({ hubUrl: 'https://hub.test/h' }), null);
});

test('messages within one delay are merged into one apply', () => {
    const h = harness();
    h.dispatcher.receive(message(['page:1']));
    h.dispatcher.receive(message(['page:1', 'navigation']));
    assert.equal(h.timers.length, 1);
    assert.equal(h.timers[0].ms, 120);
    h.timers[0].callback();
    assert.deepEqual(h.applied, [['page:1', 'navigation']]);
    assert.equal(h.rebootstraps(), 0);
});

test('an acl message asks for a new bootstrap', () => {
    const h = harness();
    h.dispatcher.receive(message(['acl']));
    h.timers[0].callback();
    assert.equal(h.rebootstraps(), 1);
});

test('a message that is not valid is ignored', () => {
    const h = harness();
    h.dispatcher.receive('not json');
    h.dispatcher.receive(JSON.stringify({ v: 2, tags: ['page:1'] }));
    h.dispatcher.receive(JSON.stringify({ v: 1, tags: 'page:1' }));
    assert.equal(h.timers.length, 0);
});

test('dispose drops what waits for its delay', () => {
    const h = harness();
    h.dispatcher.receive(message(['page:1']));
    h.dispatcher.dispose();
    assert.equal(h.timers[0].cleared, true);
    assert.deepEqual(h.applied, []);
});

test('the stream runs for guests too, only in the foreground and never in the CMS preview', () => {
    assert.equal(shouldStream({ ready: true, preview: false, foreground: true }), true);
    assert.equal(shouldStream({ ready: true, preview: false, foreground: false }), false);
    assert.equal(shouldStream({ ready: true, preview: true, foreground: true }), false);
    assert.equal(shouldStream({ ready: false, preview: false, foreground: true }), false);
});

test('a catch-up read follows only a return from the background', () => {
    assert.equal(needsCatchUp(true, true), true);
    assert.equal(needsCatchUp(false, true), false);
    assert.equal(needsCatchUp(true, false), false);
});
