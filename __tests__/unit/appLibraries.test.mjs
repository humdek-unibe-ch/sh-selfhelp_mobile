/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The app's own library list for the "about the platform" block.
 *
 * `scripts/generate-app-libraries.mjs` reads `package.json` `dependencies` and
 * the installed packages, and writes `config/appLibraries.generated.json`. The
 * file is committed (EAS cloud builds and the web preview image run no npm
 * hook), so these tests are what stops it from drifting: they fail as soon as
 * the committed file no longer matches what is installed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    APP_LIBRARIES_OUTPUT,
    GENERATE_COMMAND,
    checkAppLibraries,
    collectAppLibraries,
    describeFailure,
    generateAppLibraries,
    normalizeLicense,
    renderAppLibraries,
} from '../../scripts/generate-app-libraries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'generate-app-libraries.mjs');

/** A throw-away project: a `package.json` plus the packages "installed" in its `node_modules`. */
function makeProject(t, { dependencies, devDependencies = {}, installed }) {
    const dir = mkdtempSync(join(tmpdir(), 'app-libraries-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', dependencies, devDependencies }));
    for (const [name, pkg] of Object.entries(installed)) {
        const folder = join(dir, 'node_modules', ...name.split('/'));
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, 'package.json'), JSON.stringify({ name, ...pkg }));
    }

    return {
        dir,
        packageJsonPath: join(dir, 'package.json'),
        nodeModulesDir: join(dir, 'node_modules'),
        outputPath: join(dir, 'config', 'appLibraries.generated.json'),
    };
}

const fixture = (t) =>
    makeProject(t, {
        dependencies: { zod: '^3.0.0', '@scope/beta': '^2.0.0', expo: '~55.0.0', 'left-pad': '1.0.0' },
        devDependencies: { typescript: '^5.0.0' },
        installed: {
            zod: { version: '3.25.1', license: 'MIT' },
            '@scope/beta': { version: '2.1.0', licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] },
            expo: { version: '55.0.27', license: { type: 'MIT' } },
            'left-pad': { version: '1.0.0' },
            typescript: { version: '5.9.2', license: 'Apache-2.0' },
        },
    });

// --- licence shapes --------------------------------------------------------------------------------------------

test('a licence is read from every shape npm packages use', () => {
    assert.equal(normalizeLicense({ license: 'MIT' }), 'MIT');
    assert.equal(normalizeLicense({ license: '(MIT OR Apache-2.0)' }), '(MIT OR Apache-2.0)');
    assert.equal(normalizeLicense({ license: { type: 'BSD-3-Clause' } }), 'BSD-3-Clause');
    assert.equal(normalizeLicense({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
    assert.equal(normalizeLicense({ licenses: ['ISC', { type: 'ISC' }] }), 'ISC', 'the same licence is not listed twice');
});

test('a package that declares no usable licence gets null, never an empty string', () => {
    assert.equal(normalizeLicense({}), null);
    assert.equal(normalizeLicense({ license: '' }), null);
    assert.equal(normalizeLicense({ license: '   ' }), null);
    assert.equal(normalizeLicense({ license: 42 }), null);
    assert.equal(normalizeLicense({ licenses: [] }), null);
});

// --- collecting ------------------------------------------------------------------------------------------------

test('the list holds the dependencies only, with the installed version and licence, sorted by name', (t) => {
    const project = fixture(t);

    const { items, missing } = collectAppLibraries(project);

    assert.deepEqual(missing, []);
    assert.deepEqual(items, [
        { name: '@scope/beta', version: '2.1.0', license: 'MIT OR Apache-2.0' },
        { name: 'expo', version: '55.0.27', license: 'MIT' },
        { name: 'left-pad', version: '1.0.0', license: null },
        { name: 'zod', version: '3.25.1', license: 'MIT' },
    ]);
    assert.ok(!items.some((entry) => entry.name === 'typescript'), 'devDependencies are not part of the app');
});

test('the version is the installed one, not the declared range', (t) => {
    const project = fixture(t);

    const { items } = collectAppLibraries(project);

    assert.equal(items.find((entry) => entry.name === 'zod').version, '3.25.1');
    assert.equal(items.find((entry) => entry.name === 'expo').version, '55.0.27');
});

test('a dependency that is not installed is reported and left out, not invented', (t) => {
    const project = makeProject(t, {
        dependencies: { present: '1.0.0', absent: '^1.0.0' },
        installed: { present: { version: '1.0.0', license: 'MIT' } },
    });

    const { items, missing } = collectAppLibraries(project);

    assert.deepEqual(missing, ['absent']);
    assert.deepEqual(items, [{ name: 'present', version: '1.0.0', license: 'MIT' }]);
});

test('the file is pretty JSON with a trailing newline', () => {
    const rendered = renderAppLibraries([{ name: 'a', version: '1.0.0', license: 'MIT' }]);

    assert.ok(rendered.endsWith('}\n]\n'));
    assert.ok(rendered.startsWith('[\n  {\n    "name": "a"'));
    assert.deepEqual(JSON.parse(rendered), [{ name: 'a', version: '1.0.0', license: 'MIT' }]);
});

// --- writing ---------------------------------------------------------------------------------------------------

test('generating writes the whole list and creates the folder', (t) => {
    const project = fixture(t);

    const result = generateAppLibraries(project);

    assert.deepEqual(result, { ok: true, count: 4 });
    assert.deepEqual(JSON.parse(readFileSync(project.outputPath, 'utf8')), collectAppLibraries(project).items);
});

test('a partial install never overwrites the committed list', (t) => {
    const project = makeProject(t, {
        dependencies: { present: '1.0.0', absent: '^1.0.0' },
        installed: { present: { version: '1.0.0', license: 'MIT' } },
    });
    mkdirSync(dirname(project.outputPath), { recursive: true });
    writeFileSync(project.outputPath, '["committed"]\n');

    const result = generateAppLibraries(project);

    assert.deepEqual(result, { ok: false, missing: ['absent'] });
    assert.equal(readFileSync(project.outputPath, 'utf8'), '["committed"]\n', 'the committed file is untouched');
});

test('a partial install writes no file when there was none', (t) => {
    const project = makeProject(t, {
        dependencies: { absent: '^1.0.0' },
        installed: {},
    });

    assert.equal(generateAppLibraries(project).ok, false);
    assert.equal(existsSync(project.outputPath), false);
});

// --- the drift check -------------------------------------------------------------------------------------------

test('check: a freshly generated file is up to date', (t) => {
    const project = fixture(t);
    generateAppLibraries(project);

    assert.deepEqual(checkAppLibraries(project), { ok: true });
});

test('check: a checkout that rewrote the line endings is still up to date', (t) => {
    const project = fixture(t);
    generateAppLibraries(project);
    writeFileSync(project.outputPath, readFileSync(project.outputPath, 'utf8').replace(/\n/g, '\r\n'));

    assert.deepEqual(checkAppLibraries(project), { ok: true });
});

test('check: a dependency bumped after the file was generated makes it stale', (t) => {
    const project = fixture(t);
    generateAppLibraries(project);
    writeFileSync(
        join(project.nodeModulesDir, 'zod', 'package.json'),
        JSON.stringify({ name: 'zod', version: '3.26.0', license: 'MIT' }),
    );

    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'stale' });
});

test('check: a dependency added after the file was generated makes it stale', (t) => {
    const project = fixture(t);
    generateAppLibraries(project);
    writeFileSync(
        project.packageJsonPath,
        JSON.stringify({ name: 'fixture', dependencies: { zod: '^3.0.0', '@scope/beta': '^2.0.0', expo: '~55.0.0', 'left-pad': '1.0.0', extra: '1.0.0' } }),
    );
    mkdirSync(join(project.nodeModulesDir, 'extra'), { recursive: true });
    writeFileSync(join(project.nodeModulesDir, 'extra', 'package.json'), JSON.stringify({ name: 'extra', version: '1.0.0', license: 'MIT' }));

    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'stale' });
});

test('check: a dependency removed after the file was generated makes it stale', (t) => {
    const project = fixture(t);
    generateAppLibraries(project);
    writeFileSync(project.packageJsonPath, JSON.stringify({ name: 'fixture', dependencies: { zod: '^3.0.0' } }));

    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'stale' });
});

test('check: a missing, broken or unverifiable file is reported with its reason', (t) => {
    const project = fixture(t);
    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'missing-file' });

    mkdirSync(dirname(project.outputPath), { recursive: true });
    writeFileSync(project.outputPath, '{ not json');
    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'invalid-file' });

    rmSync(join(project.nodeModulesDir, 'zod'), { recursive: true, force: true });
    assert.deepEqual(checkAppLibraries(project), { ok: false, reason: 'not-installed', missing: ['zod'] });
});

test('every failure tells the developer what to do', () => {
    for (const result of [
        { ok: false, reason: 'stale' },
        { ok: false, reason: 'missing-file' },
        { ok: false, reason: 'invalid-file' },
    ]) {
        assert.ok(describeFailure(result).includes(GENERATE_COMMAND), result.reason);
    }
    assert.match(describeFailure({ ok: false, reason: 'not-installed', missing: ['expo', 'react'] }), /expo, react.*npm ci/);
});

// --- P4-A2: the real list, and the committed file must not drift ----------------------------------------------

const realPackage = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const committed = JSON.parse(readFileSync(APP_LIBRARIES_OUTPUT, 'utf8'));

test('the committed list holds every dependency of package.json with a version and a licence', () => {
    const declared = Object.keys(realPackage.dependencies).sort();

    assert.deepEqual(
        committed.map((entry) => entry.name),
        declared,
        'one entry per dependency, sorted by name',
    );
    for (const name of ['expo', 'react', 'react-native', '@selfhelp/shared']) {
        assert.ok(committed.some((entry) => entry.name === name), `${name} is in the list`);
    }
    for (const entry of committed) {
        assert.equal(typeof entry.version, 'string', `${entry.name} has a version`);
        assert.ok(entry.version.length > 0, `${entry.name} has a version`);
        assert.equal(typeof entry.license, 'string', `${entry.name} has a licence`);
        assert.ok(entry.license.length > 0, `${entry.name} has a licence`);
    }
});

test('no devDependency is part of the list', () => {
    const names = new Set(committed.map((entry) => entry.name));

    for (const name of Object.keys(realPackage.devDependencies ?? {})) {
        if (!(name in realPackage.dependencies)) {
            assert.ok(!names.has(name), `${name} is a devDependency and must not be listed`);
        }
    }
});

test('an exactly pinned dependency shows the pinned version', () => {
    const shared = committed.find((entry) => entry.name === '@selfhelp/shared');

    assert.equal(shared.version, realPackage.dependencies['@selfhelp/shared']);
});

test('the committed list matches the installed packages (run "npm run generate:app-libraries" after changing dependencies)', () => {
    const result = checkAppLibraries();

    assert.deepEqual(result, { ok: true }, describeFailure(result));
});

test('the check also works as a command and exits 0 for the committed list', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });

    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /up to date/);
});
