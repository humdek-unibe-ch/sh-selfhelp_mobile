import type { IPageItem } from '@selfhelp/shared';

export function getPageLabel(page: IPageItem): string {
    return page.title ?? page.keyword;
}

export function getPageHref(page: IPageItem): string {
    return page.keyword === 'home' ? '/' : `/${page.keyword}`;
}

export function getTopLevelMenuPages(pages: IPageItem[]): IPageItem[] {
    return pages
        .filter((page) => !page.parent_page_id && page.navPosition !== null && !page.is_headless)
        .sort((a, b) => (a.navPosition ?? 0) - (b.navPosition ?? 0));
}

export function flattenPages(pages: IPageItem[]): IPageItem[] {
    return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

export function findPageByKeyword(pages: IPageItem[], keyword: string): IPageItem | null {
    return flattenPages(pages).find((page) => page.keyword === keyword) ?? null;
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
