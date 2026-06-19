/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/

/**
 * Derive up to two uppercase initials from a person/display name, mirroring the
 * web Avatar's Mantine `name` auto-initials behaviour. Kept in a `.ts` module so
 * the mobile `node --test` suite can import it (it cannot load `.tsx`/JSX).
 */
export function initialsFromName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
}
