/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Minimal render harness for the mobile `node --test` suites (plan §21,
 * Slice 9).
 *
 * `renderHook` runs a hook once inside a throwaway React component and
 * returns its value. It uses `react-dom/server`'s `renderToStaticMarkup`
 * (react-dom is already an app dependency) so hooks like `useMemo` execute
 * in a real React render pass — no DOM, no jsdom, no `react-test-renderer`
 * (deprecated in React 19), and no extra test framework (mobile is
 * `node --test` only, plan §25).
 *
 * It is deliberately scoped to hooks that return serialisable values
 * (the renderer helpers). Rendering full React Native host components to a
 * snapshot needs a native renderer and is out of scope here.
 */

import { createElement, type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function renderHook<T>(useHook: () => T): T {
    let captured: { value: T } | null = null;

    const Probe: FC = () => {
        captured = { value: useHook() };
        return null;
    };

    renderToStaticMarkup(createElement(Probe));

    if (captured === null) {
        throw new Error('renderHook: the probe component never rendered.');
    }
    return (captured as { value: T }).value;
}
