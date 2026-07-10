/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Navigation helpers shared by the drawer, bottom tab bar, segmented child
 * tabs, and modal-vs-route resolution.
 *
 * Menu membership comes from the menu-builder payload (`mobile_drawer`,
 * `mobile_bottom_tabs`). Page tree lookups still use `IPageItem[]` from
 * `/pages/language/{id}` for keyword resolution and branch nav.
 */

import type {
    INavigationMenuItem,
    INavigationPayload,
    IPageItem,
} from '@selfhelp/shared';
import {
    buildPublicPathFromRoute,
    getNavigationItemLabel,
    getNavigationItemMobileHref,
    isOnAnyMobileMenuFromPayload,
    pageUrlToMobileRoute,
} from '@selfhelp/shared';

export function getNavigationItemHref(item: INavigationMenuItem): string {
    return getNavigationItemMobileHref(item);
}

export function getPageLabel(page: IPageItem): string {
    return page.title ?? page.keyword;
}

export function getPageHref(page: IPageItem): string {
    return pageUrlToMobileRoute(page.url, page.keyword);
}

export function menuItemToPageItem(item: INavigationMenuItem): IPageItem | null {
    const page = item.page;
    if (!page) {
        return null;
    }
    return {
        id: page.id,
        id_pages: page.id,
        keyword: page.keyword,
        url: page.url,
        parent_page_id: null,
        is_headless: false,
        title: page.title ?? item.label,
        icon: item.icon,
        mobile_icon: item.mobile_icon,
        children: (item.children ?? [])
            .map(menuItemToPageItem)
            .filter((child): child is IPageItem => child !== null),
    };
}

export function getDrawerMenuItems(navigation: INavigationPayload | null | undefined): INavigationMenuItem[] {
    return navigation?.menus?.mobile_drawer?.items ?? [];
}

export function getBottomTabMenuItems(navigation: INavigationPayload | null | undefined): INavigationMenuItem[] {
    const items = navigation?.menus?.mobile_bottom_tabs?.items ?? [];
    const limit = navigation?.menus?.mobile_bottom_tabs?.item_limit ?? 5;
    return items.slice(0, limit > 0 ? limit : items.length);
}

/** Holder tabs redirect to the first menu-visible child when pressed. */
export function resolveTabPressHref(item: INavigationMenuItem): string {
    const children = (item.children ?? []).filter(
        (child) => child.page != null && child.is_active !== false,
    );
    if (children.length > 0) {
        return getNavigationItemHref(children[0]);
    }

    return getNavigationItemHref(item);
}

/** Flatten menu items (post-filter) for keyword lookup helpers. */
export function flattenMenuItems(items: INavigationMenuItem[]): INavigationMenuItem[] {
    return items.flatMap((item) => [item, ...flattenMenuItems(item.children ?? [])]);
}

/** Flatten the *full* page tree (used for keyword lookup, no menu filter). */
export function flattenPages(pages: IPageItem[]): IPageItem[] {
    return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

export function findPageByKeyword(pages: IPageItem[], keyword: string): IPageItem | null {
    return flattenPages(pages).find((page) => page.keyword === keyword) ?? null;
}

export function findMenuItemByKeyword(
    items: INavigationMenuItem[],
    keyword: string,
): INavigationMenuItem | null {
    return flattenMenuItems(items).find((item) => item.page?.keyword === keyword) ?? null;
}

/**
 * True when `keyword` is represented on a resolved mobile menu surface
 * (`mobile_drawer` or `mobile_bottom_tabs` from `GET /navigation`).
 */
export function isKeywordOnResolvedMobileMenu(
    pages: IPageItem[],
    keyword: string,
    navigation?: INavigationPayload | null,
): boolean {
    if (!navigation) {
        return false;
    }
    const page = findPageByKeyword(pages, keyword);
    if (!page) {
        return false;
    }
    const pageId = page.id_pages ?? page.id;
    return isOnAnyMobileMenuFromPayload(navigation, pageId);
}

/** Normalise an internal target ("/impressum", "impressum", "/") to a URL path. */
export function normalizeNavigationTarget(target: string): string {
    const trimmed = target.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            return new URL(trimmed).pathname || '/';
        } catch {
            return trimmed;
        }
    }
    if (!trimmed.startsWith('/')) {
        return `/${trimmed}`;
    }
    return trimmed === '' ? '/' : trimmed;
}

/** Normalise an internal target to a page keyword (legacy catch-all route identity). */
export function toKeyword(target: string): string {
    const path = normalizeNavigationTarget(target);
    const trimmed = path.replace(/^\/+/, '').trim();
    return trimmed === '' ? 'home' : trimmed.split('/')[0] ?? 'home';
}

export function findPageByUrl(pages: IPageItem[], urlPath: string): IPageItem | null {
    const normalized = urlPath === '' ? '/' : urlPath.replace(/\/+$/, '') || '/';
    return flattenPages(pages).find((page) => {
        const pageUrl = (page.url ?? '').replace(/\/+$/, '') || '/';
        return pageUrl === normalized;
    }) ?? null;
}

export function findMenuItemByUrl(
    items: INavigationMenuItem[],
    urlPath: string,
): INavigationMenuItem | null {
    const normalized = urlPath === '' ? '/' : urlPath.replace(/\/+$/, '') || '/';
    return flattenMenuItems(items).find((item) => {
        if (!item.page) {
            return false;
        }
        const itemUrl = (item.page.url ?? '').replace(/\/+$/, '') || '/';
        return itemUrl === normalized;
    }) ?? null;
}

export type TPageNavigation =
    | { kind: 'modal'; keyword: string }
    | { kind: 'route'; keyword: string; href: string };

export function resolvePageNavigation(
    target: string,
    pages: IPageItem[] | undefined,
    navigation?: INavigationPayload | null,
): TPageNavigation {
    const path = normalizeNavigationTarget(target);
    let keyword: string | undefined;
    let href: string | undefined;

    if (navigation) {
        const drawer = getDrawerMenuItems(navigation);
        const tabs = getBottomTabMenuItems(navigation);
        const menuItem = findMenuItemByUrl(drawer, path)
            ?? findMenuItemByUrl(tabs, path);
        if (menuItem?.page) {
            keyword = menuItem.page.keyword;
            href = getNavigationItemHref(menuItem);
        }
    }

    const pageFromUrl = pages ? findPageByUrl(pages, path) : null;
    if (!keyword) {
        keyword = pageFromUrl?.keyword ?? toKeyword(target);
    }

    if (!href) {
        if (navigation) {
            const drawer = getDrawerMenuItems(navigation);
            const tabs = getBottomTabMenuItems(navigation);
            const menuItem = findMenuItemByKeyword(drawer, keyword)
                ?? findMenuItemByKeyword(tabs, keyword);
            if (menuItem) {
                href = getNavigationItemHref(menuItem);
            }
        }
        if (!href && pageFromUrl) {
            href = getPageHref(pageFromUrl);
        } else if (!href && pages) {
            const page = findPageByKeyword(pages, keyword);
            if (page) {
                href = getPageHref(page);
            }
        }
    }
    href = href ?? pageUrlToMobileRoute(pageFromUrl?.url ?? null, keyword);

    if (pages && !isKeywordOnResolvedMobileMenu(pages, keyword, navigation)) {
        return { kind: 'modal', keyword };
    }
    return { kind: 'route', keyword, href };
}

export function iconForPage(page: IPageItem): string {
    const keyword = page.keyword.toLowerCase();
    if (keyword.includes('home')) return '⌂';
    if (keyword.includes('menu')) return '☰';
    if (keyword.includes('profile') || keyword.includes('user')) return '◉';
    if (keyword.includes('team')) return '◆';
    if (keyword.includes('help') || keyword.includes('info')) return '?';
    return getPageLabel(page).slice(0, 1).toUpperCase();
}

export function isPageActive(page: IPageItem, pathname: string): boolean {
    const href = getPageHref(page);
    if (pathname === href) return true;
    if (href === '/index' && (pathname === '' || pathname === '/' || pathname === '/index')) return true;
    if (href !== '/' && pathname.startsWith(`${href}/`)) return true;
    if (page.children?.length) {
        return page.children.some((child) => isPageActive(child, pathname));
    }
    return false;
}

/** True when the target path has more than one segment (needs DB resolve). */
export function isParameterizedNavigationPath(target: string): boolean {
    const path = normalizeNavigationTarget(target);
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    return segments.length > 1;
}

/**
 * Path handed to modal / `usePageContent` after a successful `/pages/resolve`.
 *
 * Backend `canonical_url` and page `url` are often route *patterns*
 * (`/team-members/{record_id}`). Those are not fetchable — using them made
 * off-menu entry-record opens (Live Preview sync + in-app "Profil ansehen")
 * look like a no-op. Prefer a non-template candidate, else the concrete
 * requested path that just resolved.
 */
export function concretePathAfterResolve(
    requestedPath: string,
    page: {
        canonical_url?: string | null;
        url?: string | null;
    },
): string {
    const requested = requestedPath.replace(/\/+$/, '') || '/';
    for (const candidate of [page.canonical_url, page.url]) {
        if (!candidate || candidate.includes('{')) {
            continue;
        }
        return candidate.replace(/\/+$/, '') || requested;
    }
    return requested;
}

export { buildPublicPathFromRoute, getNavigationItemLabel };
