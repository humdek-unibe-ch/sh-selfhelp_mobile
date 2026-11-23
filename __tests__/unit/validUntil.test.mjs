/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync, mobile (P5-A3): `sync.valid_until` reads the open page again once, at that moment plus a random
 * delay; nothing fires when the screen is closed or the app is in the background. Fake clock and timers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_TIMER_MS,
    MIN_REARM_GAP_MS,
    scheduleValidUntilRefetch,
    validUntilDelayMs,
    validUntilMs,
} from '../../services/validUntil.ts';

/** A clock with timers that fire when `advance` passes their due time. */
function fakeClock(start = Date.parse('2026-12-01T00:00:00Z') - 10_000) {
    let now = start;
    let nextId = 1;
    const timers = new Map();
    return {
        now: () => now,
        setTimer: (callback, ms) => {
            const id = nextId++;
            timers.set(id, { callback, at: now + ms });
            return id;
        },
        clearTimer: (id) => {
            timers.delete(id);
        },
        pending: () => timers.size,
        advance(ms) {
            const target = now + ms;
            for (;;) {
                const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
                if (!due) {
                    break;
                }
                timers.delete(due[0]);
                now = due[1].at;
                due[1].callback();
            }
            now = target;
        },
    };
}

const UNTIL = '2026-12-01T00:00:00Z';

function arm(clock, overrides = {}) {
    const refetches = [];
    const cancel = scheduleValidUntilRefetch(
        {
            validUntil: UNTIL,
            isForeground: () => true,
            refetch: () => refetches.push(clock.now()),
            ...overrides,
        },
        { now: clock.now, random: () => 0.5, setTimer: clock.setTimer, clearTimer: clock.clearTimer },
    );
    return { refetches, cancel };
}

test('valid_until reads the page again once, after the moment plus a random delay of up to 2 seconds', () => {
    const clock = fakeClock();
    const { refetches } = arm(clock);
    clock.advance(9_999);
    assert.equal(refetches.length, 0);
    clock.advance(1_001);
    assert.equal(refetches.length, 1);
    clock.advance(60_000);
    assert.equal(refetches.length, 1, 'fires once, it is not polling');
});

test('nothing is armed for a page without valid_until', () => {
    const clock = fakeClock();
    const { refetches } = arm(clock, { validUntil: null });
    assert.equal(clock.pending(), 0);
    clock.advance(100_000);
    assert.equal(refetches.length, 0);
});

test('closing the screen cancels the read', () => {
    const clock = fakeClock();
    const { refetches, cancel } = arm(clock);
    cancel();
    assert.equal(clock.pending(), 0);
    clock.advance(100_000);
    assert.equal(refetches.length, 0);
});

test('a timer that fires while the app is in the background reads nothing', () => {
    const clock = fakeClock();
    let foreground = true;
    const { refetches } = arm(clock, { isForeground: () => foreground });
    foreground = false;
    clock.advance(100_000);
    assert.equal(refetches.length, 0);
});

test('a far-off valid_until is reached in steps and still fires once', () => {
    const farFuture = '2027-06-01T00:00:00Z';
    const clock = fakeClock();
    const { refetches } = arm(clock, { validUntil: farFuture });
    const gap = Date.parse(farFuture) - clock.now();
    assert.ok(gap > MAX_TIMER_MS, 'the moment is further away than one timer holds');
    clock.advance(gap - 3_000);
    assert.equal(refetches.length, 0);
    clock.advance(10_000);
    assert.equal(refetches.length, 1);
});

test('a device clock ahead of the server does not loop: the next read waits at least a minute', () => {
    const lastFiredAt = Date.parse(UNTIL);
    const now = lastFiredAt + 1_000;
    const delay = validUntilDelayMs('2026-11-30T00:00:00Z', now, () => 0, lastFiredAt);
    assert.equal(delay, MIN_REARM_GAP_MS - 1_000);
});

test('the fire time is reported to the caller', () => {
    const clock = fakeClock();
    const fired = [];
    arm(clock, { onFired: (at) => fired.push(at) });
    clock.advance(20_000);
    assert.equal(fired.length, 1);
});

test('an unreadable valid_until is ignored', () => {
    assert.equal(validUntilMs('soon'), null);
    assert.equal(validUntilMs(''), null);
    assert.equal(validUntilMs(UNTIL), Date.parse(UNTIL));
});
