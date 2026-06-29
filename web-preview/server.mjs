/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Static + reverse-proxy server for the `selfhelp-mobile-preview` image.
 *
 * Responsibilities:
 *   1. Serve the Expo web export under `BASE_URL` (default `/mobile-preview`)
 *      with an SPA fallback to `index.html`.
 *   2. Reverse-proxy a NARROW allowlist of `BASE_URL/api/*` requests to the
 *      private backend (`SELFHELP_BACKEND_INTERNAL_URL`), stripping the
 *      `BASE_URL/api` prefix so the backend sees a normal `/cms-api/...` path.
 *      This is the only path from the public preview to the private backend.
 *      Core routes are GET-only (plus the one-time-code exchange POST); plugin
 *      PUBLIC runtime routes (`/cms-api/v{n}/plugins/...`) are forwarded for any
 *      method so embedded plugin styles (e.g. SurveyJS) can load and submit.
 *      This mirrors the backend `MobilePreviewAccessGuard` (defense in depth:
 *      even a leaked scoped token cannot reach a core write/admin route here).
 *   3. Expose `BASE_URL/version.json` (image version + mobileRendererVersion +
 *      bundledPlugins) and `BASE_URL/healthz` for the orchestrator probe.
 *
 * Node built-ins only (no dependencies) so the runtime image stays slim. The
 * allowlist + path helpers are exported for `node --test`.
 *
 * Env:
 *   - PORT (default 8080)
 *   - SELFHELP_BACKEND_INTERNAL_URL (e.g. http://backend:8080) — required to proxy
 *   - SELFHELP_PREVIEW_BASE_URL (default /mobile-preview)
 *   - SELFHELP_PREVIEW_DIST_DIR (default ./dist)
 */

import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BASE_URL = '/mobile-preview';

/**
 * Backend GET path prefixes the preview proxy may forward. Matches the backend
 * `MobilePreviewAccessGuard` read allowlist (pages render, languages, plugin
 * manifest, the previewed user's data).
 */
export const ALLOWED_GET_PREFIXES = [
    '/cms-api/v1/pages',
    '/cms-api/v1/languages',
    '/cms-api/v1/plugins/manifest',
    '/cms-api/v1/auth/user-data',
];

/** The single POST the proxy allows: the one-time preview-code exchange. */
export const ALLOWED_POST_EXACT = ['/cms-api/v1/mobile-preview/session/exchange'];

/**
 * Plugin PUBLIC runtime routes (`/cms-api/v{n}/plugins/...`). Mirrors the
 * backend `MobilePreviewAccessGuard.isPluginPublicRoute()`: a previewed page may
 * embed plugin styles (e.g. the SurveyJS runtime) that load, autosave and submit
 * through the plugin's PUBLIC api with any method. The permission-gated admin
 * surface (`/cms-api/v{n}/admin/plugins/...`) is intentionally NOT matched —
 * `admin/` follows the version segment, so it never satisfies this prefix.
 */
const PLUGIN_PUBLIC_ROUTE = /^\/cms-api\/v\d+\/plugins\//;

/**
 * @param {string} backendPath path beginning with `/cms-api/...` (may include `?query`)
 * @returns {boolean}
 */
export function isPluginPublicRoute(backendPath) {
    return PLUGIN_PUBLIC_ROUTE.test(String(backendPath).split('?')[0]);
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
};

/**
 * Decide whether a backend path (after the proxy prefix is stripped) is allowed
 * for the given method. Query strings are ignored for the decision.
 *
 * @param {string} method HTTP method
 * @param {string} backendPath path beginning with `/cms-api/...` (may include `?query`)
 * @returns {boolean}
 */
export function isProxyAllowed(method, backendPath) {
    const path = String(backendPath).split('?')[0];
    // Plugin PUBLIC runtime routes (any method) — mirrors the backend
    // MobilePreviewAccessGuard so embedded plugin styles (e.g. the SurveyJS
    // runtime) can load, autosave and submit in the preview exactly as on the
    // live page. The admin plugin surface is excluded by the prefix shape.
    if (isPluginPublicRoute(path)) {
        return true;
    }
    if (method === 'GET') {
        return ALLOWED_GET_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    }
    if (method === 'POST') {
        return ALLOWED_POST_EXACT.includes(path);
    }
    return false;
}

/**
 * Strip the `${baseUrl}/api` proxy prefix from an incoming request URL,
 * returning the backend path (with query string) or null when the request is
 * not an API request.
 *
 * @param {string} requestUrl raw request URL (path + query)
 * @param {string} baseUrl preview base path, e.g. `/mobile-preview`
 * @returns {string | null}
 */
export function resolveBackendPath(requestUrl, baseUrl) {
    const apiPrefix = `${baseUrl.replace(/\/+$/, '')}/api`;
    if (requestUrl === apiPrefix) return '/';
    if (requestUrl.startsWith(`${apiPrefix}/`)) {
        return requestUrl.slice(apiPrefix.length);
    }
    if (requestUrl.startsWith(`${apiPrefix}?`)) {
        return `/${requestUrl.slice(apiPrefix.length)}`;
    }
    return null;
}

function contentTypeFor(filePath) {
    return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
}

/**
 * Reverse-proxy an allowed request to the backend. Streams the request body and
 * pipes the backend response straight back.
 */
function proxyToBackend(req, res, backendUrl, backendPath) {
    let target;
    try {
        target = new URL(backendPath, backendUrl);
    } catch {
        sendJson(res, 502, { error: 'Bad backend URL' });
        return;
    }

    const driver = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers = { ...req.headers, host: target.host };

    const upstream = driver(
        {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port,
            path: `${target.pathname}${target.search}`,
            method: req.method,
            headers,
        },
        (backendRes) => {
            res.writeHead(backendRes.statusCode ?? 502, backendRes.headers);
            backendRes.pipe(res);
        },
    );

    upstream.on('error', () => {
        if (!res.headersSent) sendJson(res, 502, { error: 'Upstream request failed' });
        else res.end();
    });

    req.pipe(upstream);
}

async function serveStatic(res, distDir, baseUrl, requestPath) {
    const relative = requestPath.slice(baseUrl.length).replace(/^\/+/, '') || 'index.html';
    // Prevent path traversal: normalize and ensure the resolved file stays
    // inside distDir.
    const safeRelative = normalize(relative).replace(/^(\.\.[/\\])+/, '');
    const filePath = resolve(distDir, safeRelative);
    if (!filePath.startsWith(resolve(distDir))) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    try {
        const info = await stat(filePath);
        if (info.isFile()) {
            res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
            createReadStream(filePath).pipe(res);
            return;
        }
    } catch {
        /* fall through to SPA fallback */
    }

    // SPA fallback: serve index.html for client-side routes.
    try {
        const indexPath = resolve(distDir, 'index.html');
        const html = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        res.end(html);
    } catch {
        sendJson(res, 404, { error: 'Not found' });
    }
}

async function serveVersion(res, distDir, versionInfo) {
    // Prefer a CI-written dist/version.json; fall back to the provided object.
    try {
        const raw = await readFile(resolve(distDir, 'version.json'), 'utf-8');
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'] });
        res.end(raw);
        return;
    } catch {
        sendJson(res, 200, versionInfo ?? { version: 'unknown' });
    }
}

/**
 * Create the preview HTTP server.
 *
 * @param {{ distDir?: string, backendUrl?: string|null, baseUrl?: string, versionInfo?: object }} options
 * @returns {import('node:http').Server}
 */
export function createPreviewServer(options = {}) {
    const distDir = options.distDir ?? resolve(process.cwd(), 'dist');
    const backendUrl = options.backendUrl ?? null;
    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const versionInfo = options.versionInfo ?? { version: 'unknown' };

    return createHttpServer((req, res) => {
        const method = req.method ?? 'GET';
        const url = req.url ?? '/';
        const pathOnly = url.split('?')[0];

        // Health probe (unprefixed + prefixed both accepted).
        if (pathOnly === '/healthz' || pathOnly === `${baseUrl}/healthz`) {
            sendJson(res, 200, { status: 'ok' });
            return;
        }

        // Version manifest.
        if (pathOnly === `${baseUrl}/version.json`) {
            void serveVersion(res, distDir, versionInfo);
            return;
        }

        // API proxy (allowlist).
        const backendPath = resolveBackendPath(url, baseUrl);
        if (backendPath !== null) {
            if (!backendUrl) {
                sendJson(res, 503, { error: 'Backend not configured' });
                return;
            }
            if (!isProxyAllowed(method, backendPath)) {
                sendJson(res, 403, { error: 'Not permitted for mobile preview' });
                return;
            }
            proxyToBackend(req, res, backendUrl, backendPath);
            return;
        }

        // Static assets under the base path (GET/HEAD only).
        if ((method === 'GET' || method === 'HEAD') && (pathOnly === baseUrl || pathOnly.startsWith(`${baseUrl}/`))) {
            void serveStatic(res, distDir, baseUrl, pathOnly);
            return;
        }

        // Root redirect to the base path for convenience.
        if (pathOnly === '/') {
            res.writeHead(302, { Location: `${baseUrl}/` });
            res.end();
            return;
        }

        sendJson(res, 404, { error: 'Not found' });
    });
}

// Direct execution: boot the server from env.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
    const port = Number(process.env.PORT ?? 8080);
    const server = createPreviewServer({
        distDir: process.env.SELFHELP_PREVIEW_DIST_DIR
            ? resolve(process.env.SELFHELP_PREVIEW_DIST_DIR)
            : resolve(process.cwd(), 'dist'),
        backendUrl: process.env.SELFHELP_BACKEND_INTERNAL_URL ?? null,
        baseUrl: process.env.SELFHELP_PREVIEW_BASE_URL ?? DEFAULT_BASE_URL,
    });
    server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`[mobile-preview] serving on :${port} (base ${process.env.SELFHELP_PREVIEW_BASE_URL ?? DEFAULT_BASE_URL})`);
    });
}
