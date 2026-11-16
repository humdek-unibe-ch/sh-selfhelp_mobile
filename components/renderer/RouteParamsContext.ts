/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The route parameters of the screen a page is drawn on.
 *
 * `CmsPageScreen` provides them (they come from the link that opened the
 * screen); a style that reads state from the link, such as the form lists with
 * their `<key>.record` / `<key>.q` parameters, reads them here instead of
 * asking the router itself, so it works wherever the page is drawn and
 * `node --test` can pass its own.
 */
import { createContext, useContext } from 'react';

export type TRouteParams = Readonly<Record<string, string | readonly string[] | undefined>>;

const NO_PARAMS: TRouteParams = Object.freeze({});

export const RouteParamsContext = createContext<TRouteParams>(NO_PARAMS);

/** The route parameters of the screen; empty outside a screen. */
export function useRouteParams(): TRouteParams {
    return useContext(RouteParamsContext);
}
