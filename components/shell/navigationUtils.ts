/**
 * Navigation helpers shared by the drawer, the bottom tab bar, the
 * menu fallback list, and the segmented child-tabs renderer.
 *
 * Selection rules for what a "menu page" is:
 *
 *   - `navPosition !== null`  — the CMS author placed the page on the
 *     header / drawer menu. Pages assigned only to the footer
 *     (`footerPosition !== null && navPosition === null`) are *not*
 *     shown in the mobile drawer/tabs.
 *   - `is_headless === false` — headless pages are content-only
 *     (used as fragments / API endpoints) and never appear in the UI.
 *
 * `getMenuTree()` returns the tree filtered to menu pages only,
 * preserving order via `navPosition`. `flattenMenuPages()` flattens
 * the same tree into a list (used by drawer + page-list fallback).
 *
 * `getTopLevelMenuPages()` is used by the bottom tab bar where we
 * only show the first-level menu items.
 *
 * `isPageActive()` matches the CURRENT URL pathname against a page's
 * href, including matching all of a page's descendants — so e.g.
 * landing on `/team/people` highlights the parent `team` tab too.
 */

import type { IPageItem } from '@selfhelp/shared';

export function getPageLabel(page: IPageItem): string {
    return page.title ?? page.keyword;
}

export function getPageHref(page: IPageItem): string {
    return page.keyword === 'home' ? '/' : `/${page.keyword}`;
}

function sortByNavPosition(a: IPageItem, b: IPageItem): number {
    return (a.navPosition ?? 0) - (b.navPosition ?? 0);
}

function isMenuPage(page: IPageItem): boolean {
    if (page.is_headless) return false;
    return page.navPosition !== null && page.navPosition !== undefined;
}

/**
 * Filter `pages` to only those that should appear in the navigation
 * surface (drawer / tabs / menu list), preserving the parent → child
 * tree but pruning footer-only / unassigned pages.
 */
export function getMenuTree(pages: IPageItem[]): IPageItem[] {
    return pages
        .filter(isMenuPage)
        .map((page) => ({
            ...page,
            children: page.children ? getMenuTree(page.children) : undefined,
        }))
        .sort(sortByNavPosition);
}

/** First-level menu items only (used by the bottom tab bar). */
export function getTopLevelMenuPages(pages: IPageItem[]): IPageItem[] {
    return pages
        .filter((page) => !page.parent_page_id && isMenuPage(page))
        .sort(sortByNavPosition);
}

/** Flatten a menu tree (post-filter) for the drawer body. */
export function flattenMenuPages(pages: IPageItem[]): IPageItem[] {
    return getMenuTree(pages).flatMap((page) => [
        page,
        ...(page.children ? flattenMenuPages(page.children) : []),
    ]);
}

/** Flatten the *full* tree (used for keyword lookup, no menu filter). */
export function flattenPages(pages: IPageItem[]): IPageItem[] {
    return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

export function findPageByKeyword(pages: IPageItem[], keyword: string): IPageItem | null {
    return flattenPages(pages).find((page) => page.keyword === keyword) ?? null;
}

/**
 * Lightweight icon hint — a single character per page. We keep the set
 * small intentionally so HeroUI / system fonts can render it crisply
 * on every platform without bundling an icon font.
 */
export function iconForPage(page: IPageItem): string {
    const keyword = page.keyword.toLowerCase();
    if (keyword.includes('home')) return '⌂';
    if (keyword.includes('menu')) return '☰';
    if (keyword.includes('profile') || keyword.includes('user')) return '◉';
    if (keyword.includes('team')) return '◆';
    if (keyword.includes('help') || keyword.includes('info')) return '?';
    return getPageLabel(page).slice(0, 1).toUpperCase();
}

/**
 * Active-route matcher.
 *
 * A page is considered active when:
 *
 *   - Its href equals the current pathname exactly, OR
 *   - The current pathname is one of its descendants (e.g. parent
 *     `/team` is active while we're on `/team/people`), OR
 *   - The page is `home` and the current pathname is `/`.
 */
export function isPageActive(page: IPageItem, pathname: string): boolean {
    const href = getPageHref(page);
    if (pathname === href) return true;
    if (href === '/' && (pathname === '' || pathname === '/')) return true;
    if (page.children?.length) {
        return page.children.some((child) => isPageActive(child, pathname));
    }
    return false;
}
