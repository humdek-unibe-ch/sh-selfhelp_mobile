/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Access-token lifetime helpers.
 *
 * The backend signs access tokens as JWTs with an `exp` claim. These helpers
 * read that claim WITHOUT verifying the signature: the app only needs to know
 * when to renew a token, the server stays the one that decides whether it is
 * valid. Pure and free of React Native imports so `node --test` covers them.
 */

/** A token counts as expiring this long before its real `exp` (clock skew + request time). */
export const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

const JWT_BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Expiry of a JWT access token as epoch milliseconds, or `null` when it has no readable `exp`. */
export function getAccessTokenExpiresAt(accessToken: string): number | null {
    const payload = decodeJwtPayload(accessToken);
    const exp = payload?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
}

/**
 * True when the token is known to be expired, or to expire within `skewMs`, so
 * it should be renewed before it is sent. A token whose expiry cannot be read
 * is NOT reported as expiring: the app cannot tell, and a 401 from the server
 * still decides.
 */
export function isAccessTokenExpiring(
    accessToken: string | null | undefined,
    now: number = Date.now(),
    skewMs: number = ACCESS_TOKEN_EXPIRY_SKEW_MS,
): boolean {
    if (!accessToken) return false;
    const expiresAt = getAccessTokenExpiresAt(accessToken);
    return expiresAt !== null && expiresAt <= now + skewMs;
}

function decodeJwtPayload(token: string): { exp?: unknown } | null {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    try {
        return JSON.parse(base64UrlDecode(payloadPart)) as { exp?: unknown };
    } catch {
        return null;
    }
}

function base64UrlDecode(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (const char of padded) {
        if (char === '=') break;
        const index = JWT_BASE64URL_CHARS.indexOf(char);
        if (index < 0) throw new Error('Invalid base64url character');

        buffer = (buffer << 6) | index;
        bits += 6;

        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >> bits) & 0xff);
        }
    }

    return output;
}
