/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure value helpers for the slider / range-slider form controls.
 *
 * Kept separate from the RN components so the parsing/serialisation contract
 * (CMS string value <-> numeric slider state) is unit-testable under
 * `node --test` without loading React Native.
 */

/** Clamp `n` into [min, max]. */
export function clampNumber(n: number, min: number, max: number): number {
    if (Number.isNaN(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

/**
 * Parse a single CMS field value into a slider number, clamped to range.
 * Falls back to `min` when the stored value is missing/non-numeric.
 */
export function parseSliderValue(raw: string | undefined, min: number, max: number): number {
    const n = raw === undefined || raw === '' ? NaN : Number(raw);
    return clampNumber(Number.isFinite(n) ? n : min, min, max);
}

/**
 * Parse a CMS field value into an ordered [low, high] pair for a range slider.
 * Accepts `"lo,hi"` (canonical), a single number (collapses to [n, max]),
 * or empty (defaults to [min, max]). Always returns low <= high, both clamped.
 */
export function parseRangeValue(
    raw: string | undefined,
    min: number,
    max: number,
): [number, number] {
    if (raw === undefined || raw === '') {
        return [min, max];
    }
    const parts = raw.split(',').map((p) => Number(p.trim()));
    const loRaw = Number.isFinite(parts[0]) ? parts[0] : min;
    const hiRaw = parts.length > 1 && Number.isFinite(parts[1]) ? parts[1] : max;
    const lo = clampNumber(loRaw, min, max);
    const hi = clampNumber(hiRaw, min, max);
    return lo <= hi ? [lo, hi] : [hi, lo];
}

/** Serialise a range pair back to the canonical `"lo,hi"` CMS string. */
export function serializeRangeValue(pair: readonly [number, number]): string {
    return `${pair[0]},${pair[1]}`;
}
