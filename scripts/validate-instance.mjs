#!/usr/bin/env node
/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pre-build / pre-submit guard for production-{slug} EAS profiles.
 *
 * Asserts that:
 *   - the profile exists,
 *   - no env value is "PLACEHOLDER" (case-insensitive),
 *   - the iOS submit block has real Apple credentials (no PLACEHOLDER),
 *   - the Android `serviceAccountKeyPath` file exists on disk.
 *
 * Usage:
 *   node scripts/validate-instance.mjs production-unibe
 *
 * Exit code:
 *   0  — clean.
 *   1  — at least one violation. Prints all violations.
 *
 * This is wired up via `npm run instance:validate` and is intended to
 * run before `eas build` / `eas submit` in CI so a broken profile fails
 * loud BEFORE bytes are uploaded.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const profileName = process.argv[2];
if (!profileName) {
    console.error('Usage: validate-instance.mjs <profile-name>');
    console.error('Example: validate-instance.mjs production-unibe');
    process.exit(1);
}

const easPath = resolve(process.cwd(), 'eas.json');
if (!existsSync(easPath)) {
    console.error(`✗ eas.json not found at ${easPath}`);
    process.exit(1);
}

const eas = JSON.parse(readFileSync(easPath, 'utf-8'));
const violations = [];

const buildProfile = eas.build?.[profileName];
if (!buildProfile) {
    violations.push(`build.${profileName} does not exist in eas.json`);
}

const submitProfile = eas.submit?.[profileName];
if (!submitProfile) {
    violations.push(`submit.${profileName} does not exist in eas.json`);
}

const isPlaceholder = (value) =>
    typeof value === 'string' && value.trim().toUpperCase().includes('PLACEHOLDER');

if (buildProfile?.env) {
    for (const [key, value] of Object.entries(buildProfile.env)) {
        if (isPlaceholder(value)) {
            violations.push(`build.${profileName}.env.${key} is still set to a PLACEHOLDER value`);
        }
    }
}

if (submitProfile?.ios) {
    for (const [key, value] of Object.entries(submitProfile.ios)) {
        if (isPlaceholder(value)) {
            violations.push(`submit.${profileName}.ios.${key} is still PLACEHOLDER (iOS submit will fail)`);
        }
    }
}

if (submitProfile?.android?.serviceAccountKeyPath) {
    const keyPath = resolve(process.cwd(), submitProfile.android.serviceAccountKeyPath);
    if (!existsSync(keyPath)) {
        violations.push(
            `submit.${profileName}.android.serviceAccountKeyPath -> ${submitProfile.android.serviceAccountKeyPath} not found on disk`
        );
    }
}

if (violations.length === 0) {
    console.log(`✓ ${profileName} validated — no PLACEHOLDER values, all referenced files exist.`);
    process.exit(0);
}

console.error(`✗ ${profileName} has ${violations.length} blocker${violations.length === 1 ? '' : 's'}:`);
for (const v of violations) {
    console.error(`   - ${v}`);
}
process.exit(1);
