/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The `version` style ("about the platform") on the device.
 *
 * Contract (shared `IVersionStyle`, filled by the backend after the page cache
 * is read): `section.about = { detail, product, frameworks[], plugins[],
 * libraries[] }`. The app draws the server lists, then its own generated list
 * under the `label_app` heading, and shows an exact version only when
 * `about.detail` is true. Headings come from translatable style fields.
 *
 * `buildVersionAbout` is the pure part that decides what is drawn; the native
 * component only maps it to views. The tests below check the model, then guard
 * the wiring (registry, no typed text, no typed colours, no referrer header).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildVersionAbout, filterAboutItems } from '../components/styles/auth/versionAbout.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');

const item = (name, version, license = 'MIT') => ({ name, version, license });

/** A server `about` block; with `detail` false the server sends no versions. */
const serverAbout = (detail) => ({
    detail,
    product: { name: 'SelfHelp', version: '0.1.43' },
    frameworks: [item('PHP', detail ? '8.4.2' : null, 'PHP-3.01'), item('Symfony', detail ? '7.4.1' : null)],
    plugins: [item('survey-js', detail ? '0.3.3' : null, 'MPL-2.0')],
    libraries: [item('doctrine/orm', detail ? '3.3.0' : null)],
});

/** The app's own list as the generator writes it: items always carry versions. */
const appList = () => [item('expo', '55.0.27'), item('react-native', '0.83.6')];

const text = (content) => ({ content });

/** A `version` section, headings in German to show nothing is typed in the app. */
const versionSection = (about, overrides = {}) => ({
    id: 61,
    style_name: 'version',
    about,
    title: text('Über diese Plattform'),
    label_frameworks: text('Frameworks'),
    label_plugins: text('Plugins'),
    label_libraries: text('Bibliotheken'),
    label_app: text('Mobile App'),
    label_filter: text('Filtern'),
    label_no_match: text('Nichts entspricht dem Filter.'),
    ...overrides,
});

const allVersions = (model) => model.groups.flatMap((group) => group.items.map((entry) => entry.version));

// --- P4-A1: server lists, then the app list, versions only with `detail` ---------------------------------------

test('with detail, server lists and the app list are drawn with exact versions', () => {
    const model = buildVersionAbout(versionSection(serverAbout(true)), appList());

    assert.equal(model.title, 'Über diese Plattform');
    assert.equal(model.product, 'SelfHelp 0.1.43');
    assert.deepEqual(
        model.groups.map((group) => [group.key, group.heading]),
        [
            ['frameworks', 'Frameworks'],
            ['plugins', 'Plugins'],
            ['libraries', 'Bibliotheken'],
            ['app', 'Mobile App'],
        ],
    );
    assert.deepEqual(model.groups[0].items, [item('PHP', '8.4.2', 'PHP-3.01'), item('Symfony', '7.4.1')]);
    assert.deepEqual(model.groups[1].items, [item('survey-js', '0.3.3', 'MPL-2.0')]);
    assert.deepEqual(model.groups[2].items, [item('doctrine/orm', '3.3.0')]);
    assert.deepEqual(model.groups[3].items, [item('expo', '55.0.27'), item('react-native', '0.83.6')]);
});

test('without detail, no exact version is drawn anywhere, also not from the app list', () => {
    const model = buildVersionAbout(versionSection(serverAbout(false)), appList());

    assert.deepEqual(
        model.groups.map((group) => group.key),
        ['frameworks', 'plugins', 'libraries', 'app'],
        'the same lists are drawn, only the versions are missing',
    );
    assert.deepEqual(new Set(allVersions(model)), new Set([null]));
    const serialized = JSON.stringify(model);
    for (const leaked of ['8.4.2', '7.4.1', '0.3.3', '3.3.0', '55.0.27', '0.83.6']) {
        assert.ok(!serialized.includes(leaked), `${leaked} must not be drawn without detail`);
    }
    assert.equal(model.groups[3].items[0].name, 'expo', 'names and licences stay');
    assert.equal(model.groups[3].items[0].license, 'MIT');
});

test('the SelfHelp version is always drawn, with or without detail', () => {
    assert.equal(buildVersionAbout(versionSection(serverAbout(false)), []).product, 'SelfHelp 0.1.43');
    assert.equal(buildVersionAbout(versionSection(serverAbout(true)), []).product, 'SelfHelp 0.1.43');
});

test('versions the server should not have sent are still dropped without detail', () => {
    const about = serverAbout(false);
    about.frameworks = [item('PHP', '8.4.2'), item('Symfony', '7.4.1')];
    about.plugins = [item('survey-js', '0.3.3')];

    const model = buildVersionAbout(versionSection(about), appList());

    assert.deepEqual(new Set(allVersions(model)), new Set([null]));
});

test('only a real true unlocks versions; "true", 1 or a missing flag do not', () => {
    for (const detail of ['true', 1, 'yes', {}, null, undefined]) {
        const about = { ...serverAbout(true), detail };
        const model = buildVersionAbout(versionSection(about), appList());

        assert.deepEqual(new Set(allVersions(model)), new Set([null]), `detail=${String(detail)}`);
    }
});

test('the app list is drawn last, after the server groups', () => {
    const model = buildVersionAbout(versionSection(serverAbout(true)), appList());

    assert.equal(model.groups.at(-1).key, 'app');
    assert.equal(model.groups.filter((group) => group.key === 'app').length, 1);
});

test('empty lists are left out, no empty group is drawn', () => {
    const about = { ...serverAbout(true), plugins: [] };

    const withoutPlugins = buildVersionAbout(versionSection(about), appList());
    assert.deepEqual(
        withoutPlugins.groups.map((group) => group.key),
        ['frameworks', 'libraries', 'app'],
    );

    const withoutApp = buildVersionAbout(versionSection(serverAbout(true)), []);
    assert.deepEqual(
        withoutApp.groups.map((group) => group.key),
        ['frameworks', 'plugins', 'libraries'],
        'an empty generated list draws no app group',
    );
});

test('the inputs are not changed, so one app list serves guests and admins', () => {
    const shared = appList();
    const snapshot = JSON.stringify(shared);

    buildVersionAbout(versionSection(serverAbout(false)), shared);
    assert.equal(JSON.stringify(shared), snapshot);

    const admin = buildVersionAbout(versionSection(serverAbout(true)), shared);
    assert.equal(admin.groups.at(-1).items[0].version, '55.0.27');
});

// --- headings: translatable fields, nothing typed in the app ---------------------------------------------------

test('headings come from the style fields, in the language the server sent', () => {
    const english = versionSection(serverAbout(true), {
        title: text('About this platform'),
        label_libraries: text('Libraries'),
        label_app: text('Mobile app'),
    });
    const model = buildVersionAbout(english, appList());

    assert.equal(model.title, 'About this platform');
    assert.equal(model.groups.find((group) => group.key === 'libraries').heading, 'Libraries');
    assert.equal(model.groups.find((group) => group.key === 'app').heading, 'Mobile app');
});

test('an empty or missing heading field draws no heading, the app invents no text', () => {
    const bare = { id: 61, style_name: 'version', about: serverAbout(true) };
    const model = buildVersionAbout(bare, appList());

    assert.equal(model.title, '');
    assert.equal(model.filterLabel, '');
    assert.equal(model.noMatchLabel, '');
    assert.deepEqual(
        model.groups.map((group) => group.heading),
        ['', '', '', ''],
    );
    const serialized = JSON.stringify(model);
    for (const typed of ['About this platform', 'Über diese Plattform', 'Libraries', 'Bibliotheken', 'Mobile app', 'Mobile App', 'Website', 'Filter', 'Filtern', 'Nothing matches the filter.']) {
        assert.ok(!serialized.includes(typed), `"${typed}" must come from a field, not from the app`);
    }
});

test('headings are read from the fields bag as well as from top-level fields', () => {
    const viaFields = {
        id: 61,
        style_name: 'version',
        about: serverAbout(true),
        fields: { title: text('Titel'), label_app: text('App') },
    };
    const model = buildVersionAbout(viaFields, appList());

    assert.equal(model.title, 'Titel');
    assert.equal(model.groups.at(-1).heading, 'App');
});

test('heading markup is reduced to plain text, as every displayed field is', () => {
    const model = buildVersionAbout(
        versionSection(serverAbout(true), { label_frameworks: text('<b>Frameworks</b> &amp; PHP') }),
        appList(),
    );

    assert.equal(model.groups[0].heading, 'Frameworks & PHP');
});

// --- filter: case-insensitive on name and licence --------------------------------------------------------------

test('filterAboutItems matches name and licence and leaves the list alone when the query is blank', () => {
    const items = [item('PHP', null, 'PHP-3.01'), item('Symfony', null, 'MIT')];
    assert.deepEqual(filterAboutItems(items, 'php').map((entry) => entry.name), ['PHP']);
    assert.deepEqual(filterAboutItems(items, 'mit').map((entry) => entry.name), ['Symfony']);
    assert.deepEqual(filterAboutItems(items, '  ').map((entry) => entry.name), ['PHP', 'Symfony']);
});

test('the model carries the filter labels from the style fields', () => {
    const model = buildVersionAbout(versionSection(serverAbout(false)), appList());
    assert.equal(model.filterLabel, 'Filtern');
    assert.equal(model.noMatchLabel, 'Nichts entspricht dem Filter.');
});

// --- an older backend, malformed data --------------------------------------------------------------------------

test('a section without a usable about block draws nothing', () => {
    const cases = [
        undefined,
        null,
        'about',
        [],
        {},
        { detail: true },
        { detail: true, product: null },
        { detail: true, product: { name: 'SelfHelp' } },
        { detail: true, product: { name: 'SelfHelp', version: 42 } },
        { detail: true, product: { name: '', version: '0.1.43' } },
    ];
    for (const about of cases) {
        assert.equal(buildVersionAbout(versionSection(about), appList()), null, JSON.stringify(about) ?? 'undefined');
    }
});

test('malformed list entries are skipped and never drawn as "undefined" or "null"', () => {
    const about = {
        detail: true,
        product: { name: 'SelfHelp', version: '0.1.43' },
        frameworks: [null, 'PHP', 7, [], {}, { name: '' }, { name: 'PHP', version: 8, license: ['MIT'] }, item('Symfony', '7.4.1')],
        plugins: 'not a list',
        libraries: undefined,
    };
    const model = buildVersionAbout(versionSection(about), [{ version: '1' }, null, item('expo', '55.0.27')]);

    assert.deepEqual(
        model.groups.map((group) => group.key),
        ['frameworks', 'app'],
    );
    assert.deepEqual(model.groups[0].items, [
        { name: 'PHP', version: null, license: null },
        item('Symfony', '7.4.1'),
    ]);
    assert.deepEqual(model.groups[1].items, [item('expo', '55.0.27')]);
    const serialized = JSON.stringify(model);
    assert.ok(!serialized.includes('undefined'));
});

// --- wiring guards (source level, as the other renderer tests do) ----------------------------------------------

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** String literals and JSX text of a source file: everything the app could put on screen by itself. */
const drawnStrings = (source) => {
    const code = stripComments(source);
    const strings = [];
    for (const match of code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
        strings.push(match[2]);
    }
    for (const match of code.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
        strings.push(match[1].trim());
    }
    return strings;
};

const TYPED_HEADINGS = ['About this platform', 'Über diese Plattform', 'Frameworks', 'Plugins', 'Libraries', 'Bibliotheken', 'Mobile app', 'Mobile App', 'Website', 'Filter', 'Filtern', 'Nothing matches the filter.'];

/** True when `word` stands alone in `value` (so the identifier `appLibraries` or a path is not a match). */
const containsWord = (value, word) => new RegExp(`(^|[^A-Za-z])${word}([^A-Za-z]|$)`).test(value);

test('the registry maps `version` to the new renderer, and SystemSurfaces no longer owns it', () => {
    const registry = read('components/styles/index.ts');
    assert.match(registry, /import \{ Version \} from '\.\/auth\/Version';/);
    assert.match(registry, /^\s+version: Version,$/m);

    const surfaces = read('components/styles/auth/SystemSurfaces.tsx');
    assert.doesNotMatch(surfaces, /export function Version\b/);
    assert.doesNotMatch(registry, /import \{[^}]*\bVersion\b[^}]*\} from '\.\/auth\/SystemSurfaces';/);
});

test('the renderer draws the model built from the section and the generated app list', () => {
    const source = read('components/styles/auth/Version.tsx');

    assert.match(source, /from '@\/config\/appLibraries\.generated\.json'/);
    assert.match(source, /buildVersionAbout\(section, appLibraries\)/);
    assert.match(source, /filterAboutItems/);
    assert.match(source, /useAppColors\(\)/);
});

test('no heading text and no colour value is typed in the renderer', () => {
    for (const file of ['components/styles/auth/Version.tsx', 'components/styles/auth/versionAbout.ts']) {
        const source = read(file);
        const strings = drawnStrings(source);

        assert.ok(strings.length > 0, `${file}: the string scan found nothing, so it would pass for the wrong reason`);
        for (const typed of TYPED_HEADINGS) {
            const found = strings.filter((value) => containsWord(value, typed));
            assert.deepEqual(found, [], `${file} must not type "${typed}"`);
        }

        const code = stripComments(source);
        assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b/, `${file} must use theme tokens, not colour literals`);
        assert.doesNotMatch(code, /\brgba?\(/, `${file} must use theme tokens, not colour literals`);
    }
});

test('the typed-text guard itself catches a typed heading, an identifier and a path are not flagged', () => {
    const typedInJsx = `export const A = () => <Text accessibilityRole="header">Libraries</Text>;`;
    const typedInString = `const heading = 'Mobile app';`;
    const innocent = `import appLibraries from '@/config/appLibraries.generated.json'; const key = 'libraries';`;

    assert.ok(drawnStrings(typedInJsx).some((value) => containsWord(value, 'Libraries')));
    assert.ok(drawnStrings(typedInString).some((value) => containsWord(value, 'Mobile app')));
    assert.ok(!drawnStrings(innocent).some((value) => TYPED_HEADINGS.some((word) => containsWord(value, word))));
});

test('the app sends no referrer header: apps have none', () => {
    const roots = ['app', 'components', 'config', 'constants', 'hooks', 'providers', 'services', 'stores', 'styles'];
    const offenders = [];
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) {
                walk(path);
            } else if (/\.(tsx?|jsx?|mjs)$/.test(name) && /x-referrer-host/i.test(readFileSync(path, 'utf8'))) {
                offenders.push(path.slice(ROOT.length + 1));
            }
        }
    };
    for (const root of roots) {
        try {
            walk(join(ROOT, root));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }

    assert.deepEqual(offenders, []);
});
