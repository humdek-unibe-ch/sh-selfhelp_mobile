#!/usr/bin/env node
/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Scaffolds a new SelfHelp instance build profile in eas.json.
 *
 * Usage:
 *   node scripts/add-instance.mjs <slug> <prettyName> <backendUrl> [universalLinkDomain]
 *
 * Example:
 *   node scripts/add-instance.mjs unibe "Unibe SelfHelp" https://selfhelp.unibe.ch app.selfhelp.unibe.ch
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , slug, prettyName, backendUrl, universalDomain] = process.argv;

if (!slug || !prettyName || !backendUrl) {
    console.error('Usage: add-instance.mjs <slug> <prettyName> <backendUrl> [universalLinkDomain]');
    process.exit(1);
}

if (!/^[a-z][a-z0-9-]{1,11}$/.test(slug)) {
    console.error(`Invalid slug "${slug}": lowercase, kebab-case, ≤ 12 chars.`);
    process.exit(1);
}

const easPath = resolve(process.cwd(), 'eas.json');
const eas = JSON.parse(readFileSync(easPath, 'utf-8'));

const profileKey = `production-${slug}`;
if (eas.build[profileKey]) {
    console.error(`Profile "${profileKey}" already exists.`);
    process.exit(1);
}

eas.build[profileKey] = {
    extends: 'production',
    channel: profileKey,
    env: {
        APP_INSTANCE_SLUG: slug,
        APP_NAME_OVERRIDE: prettyName,
        APP_BACKEND_URL: backendUrl,
        APP_BUNDLE_ID: `com.selfhelp.${slug}`,
        APP_PACKAGE_NAME: `com.selfhelp.${slug}`,
        APP_SCHEME: `selfhelp-${slug}`,
        ...(universalDomain ? { APP_UNIVERSAL_LINK_DOMAIN: universalDomain } : {}),
    },
};

eas.submit[profileKey] = {
    android: {
        serviceAccountKeyPath: `./secrets/play-${slug}.json`,
        track: 'internal',
        releaseStatus: 'draft',
    },
    ios: {
        appleId: 'PLACEHOLDER-fill-with-apple-id-email',
        ascAppId: 'PLACEHOLDER-fill-with-app-store-connect-id',
        appleTeamId: 'PLACEHOLDER-fill-with-apple-team-id',
    },
};

writeFileSync(easPath, JSON.stringify(eas, null, 4) + '\n', 'utf-8');

console.log(`Added build profile "${profileKey}".`);
console.log('');
console.log('REQUIRED before any prod build/submit:');
console.log(`  1. Fill the iOS submit credentials in eas.json (look for "PLACEHOLDER-…").`);
console.log(`  2. Save the Play service-account JSON to ./secrets/play-${slug}.json (gitignored).`);
console.log(`  3. Validate the profile:   npm run instance:validate -- ${profileKey}`);
console.log('');
console.log('Then build/submit:');
console.log(`  Build:  npx eas build  -p android --profile ${profileKey}`);
console.log(`  Submit: npx eas submit -p android --profile ${profileKey}`);
console.log('');
console.log('NOTE: prod builds run instance:validate automatically; PLACEHOLDER values fail the build.');
