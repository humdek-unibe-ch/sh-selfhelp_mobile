/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * A section that disappears while the person is filling in its form (live-sync decision "Swap, keep typed
 * input"): when the page is read again and a section of the old page is gone from the new one, and a form in it
 * has unsaved input, a short notice takes its place instead of the section vanishing without a word.
 *
 * `findVanishedDirtySections` compares the old and the new section tree and names every vanished section
 * whose form is dirty, with two anchors: the next and the previous sibling that still exist, so the notice is
 * drawn where the section was. `placeNotices` mixes the notices into one list of siblings.
 *
 * Pure: no React, so `node --test` covers it.
 */

export interface ISectionNode {
    id: number;
    children?: readonly ISectionNode[] | null;
}

/** One vanished section with unsaved input, and where it was. */
export interface IVanishedSection {
    id: number;
    /** The next sibling of the old page that is still on the new page (the notice goes before it). */
    beforeId: number | null;
    /** The previous sibling that is still on the new page (the notice goes after it, when `beforeId` is null). */
    afterId: number | null;
}

/** Every section id in a tree. */
export function collectSectionIds(sections: readonly ISectionNode[], into: Set<number> = new Set()): Set<number> {
    for (const section of sections) {
        into.add(section.id);
        if (section.children?.length) {
            collectSectionIds(section.children, into);
        }
    }
    return into;
}

/**
 * The sections of `previous` that are gone from `next` and whose form has unsaved input. A vanished section
 * is reported once, at the top of the vanished subtree (a container that vanished with its form inside is
 * one notice, not one per descendant).
 */
export function findVanishedDirtySections(
    previous: readonly ISectionNode[],
    next: readonly ISectionNode[],
    isDirty: (sectionId: number) => boolean,
): IVanishedSection[] {
    const nextIds = collectSectionIds(next);
    const found: IVanishedSection[] = [];

    const subtreeIsDirty = (section: ISectionNode): boolean =>
        isDirty(section.id) || (section.children ?? []).some((child) => subtreeIsDirty(child));

    const walk = (siblings: readonly ISectionNode[]): void => {
        siblings.forEach((section, index) => {
            if (nextIds.has(section.id)) {
                walk(section.children ?? []);
                return;
            }
            if (!subtreeIsDirty(section)) {
                return;
            }
            let beforeId: number | null = null;
            for (let i = index + 1; i < siblings.length; i += 1) {
                if (nextIds.has(siblings[i].id)) {
                    beforeId = siblings[i].id;
                    break;
                }
            }
            let afterId: number | null = null;
            for (let i = index - 1; i >= 0; i -= 1) {
                if (nextIds.has(siblings[i].id)) {
                    afterId = siblings[i].id;
                    break;
                }
            }
            found.push({ id: section.id, beforeId, afterId });
        });
    };
    walk(previous);

    return found;
}

/** The notices that stay: those whose section is still missing from the page. */
export function keepVanished(
    ghosts: readonly IVanishedSection[],
    added: readonly IVanishedSection[],
    next: readonly ISectionNode[],
): IVanishedSection[] {
    const nextIds = collectSectionIds(next);
    const kept = ghosts.filter((ghost) => !nextIds.has(ghost.id));
    for (const ghost of added) {
        if (!kept.some((existing) => existing.id === ghost.id)) {
            kept.push(ghost);
        }
    }
    return kept;
}

/** True when the notice has no sibling to stand next to: it is drawn at the top of the page. */
export function isUnanchored(ghost: IVanishedSection): boolean {
    return ghost.beforeId === null && ghost.afterId === null;
}

export type TPlacedItem<T extends ISectionNode> =
    | { kind: 'section'; section: T }
    | { kind: 'notice'; ghost: IVanishedSection };

/**
 * One list of siblings with the notices that belong between them: a notice goes before its `beforeId`
 * sibling, or after its `afterId` sibling when it has no later one. A notice whose anchors are not in this
 * list is not drawn here.
 */
export function placeNotices<T extends ISectionNode>(
    sections: readonly T[],
    ghosts: readonly IVanishedSection[],
): TPlacedItem<T>[] {
    if (ghosts.length === 0) {
        return sections.map((section) => ({ kind: 'section', section }));
    }
    const ids = new Set(sections.map((section) => section.id));
    const items: TPlacedItem<T>[] = [];
    for (const section of sections) {
        for (const ghost of ghosts) {
            if (ghost.beforeId === section.id) {
                items.push({ kind: 'notice', ghost });
            }
        }
        items.push({ kind: 'section', section });
        for (const ghost of ghosts) {
            const noLaterSiblingHere = ghost.beforeId === null || !ids.has(ghost.beforeId);
            if (ghost.afterId === section.id && noLaterSiblingHere) {
                items.push({ kind: 'notice', ghost });
            }
        }
    }
    return items;
}

/** The registry of "is this section's form dirty?" checks of the page on screen. */
export interface IPageDirtyRegistry {
    /** Register the check of one form section; returns the function that withdraws it. */
    register: (sectionId: number, check: () => boolean) => () => void;
    isDirty: (sectionId: number) => boolean;
}

export function createPageDirtyRegistry(): IPageDirtyRegistry {
    const checks = new Map<number, () => boolean>();
    return {
        register: (sectionId, check) => {
            checks.set(sectionId, check);
            return () => {
                if (checks.get(sectionId) === check) {
                    checks.delete(sectionId);
                }
            };
        },
        isDirty: (sectionId) => checks.get(sectionId)?.() ?? false,
    };
}
