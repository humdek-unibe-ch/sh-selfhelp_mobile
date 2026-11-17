/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure helpers over the input sections of one form: which fields it has, which
 * are required, which are file fields, whether the person changed anything and
 * what to send. Kept free of React Native so `node --test` covers them.
 *
 * The server stays the authority (it re-checks access, conditions and values on
 * every write); the required check only saves a round trip and tells the
 * person which field is missing before anything is sent.
 */
import { readBooleanField, readField } from '@/components/renderer/useField';
import type { TPickedFiles } from '@/services/formRequests';

/** Styles whose sections hold one value of the form under their `name`. */
const FORM_FIELD_STYLES: ReadonlySet<string> = new Set([
    'input',
    'text-input',
    'textarea',
    'rich-text-editor',
    'select',
    'radio',
    'checkbox',
    'slider',
    'range-slider',
    'datepicker',
    'switch',
    'combobox',
    'color-input',
    'color-picker',
    'file-input',
    'number-input',
    'segmented-control',
    'rating',
]);

/**
 * A form inside a form is its own form: its fields are not ours.
 * Includes `entry-form-list` (the list is a form) so a nested list's inputs
 * are not collected into an outer form; collecting fields of a list that is
 * its own form still works because only its children are visited.
 */
const NESTED_FORM_STYLES: ReadonlySet<string> = new Set([
    'form-log',
    'form-record',
    'entry-record-form',
    'entry-form-list',
]);

export interface IFormFieldInfo {
    /** The key of the value in the submitted form data. */
    name: string;
    /** What the person sees; used to say which field is missing. */
    label: string;
    required: boolean;
    /** A file field: sent as an upload, never as text. */
    isFile: boolean;
    /** A checkbox is "filled" only when it holds this value; null for every other field. */
    requiredValue: string | null;
}

interface ISectionNode {
    style_name?: unknown;
    children?: unknown;
    fields?: Record<string, unknown>;
}

function isSectionNode(value: unknown): value is ISectionNode {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The fields of a form, in page order, found among the sections the form contains. */
export function collectFormFields(children: unknown): IFormFieldInfo[] {
    const fields: IFormFieldInfo[] = [];

    const visit = (nodes: unknown): void => {
        if (!Array.isArray(nodes)) {
            return;
        }
        for (const node of nodes) {
            if (!isSectionNode(node)) {
                continue;
            }
            const style = typeof node.style_name === 'string' ? node.style_name : '';
            if (NESTED_FORM_STYLES.has(style)) {
                continue;
            }
            if (FORM_FIELD_STYLES.has(style)) {
                const name = readField<string>(node, 'name');
                if (typeof name === 'string' && name.trim() !== '') {
                    const label = readField<string>(node, 'label');
                    fields.push({
                        name: name.trim(),
                        label: typeof label === 'string' && label.trim() !== '' ? label.trim() : name.trim(),
                        required: readBooleanField(node, 'is_required', false),
                        isFile: style === 'file-input',
                        requiredValue: style === 'checkbox' ? (readField<string>(node, 'checkbox_value') ?? '1') : null,
                    });
                }
            }
            visit(node.children);
        }
    };

    visit(children);
    return fields;
}

function isBlank(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    return false;
}

/**
 * The required fields the person has not filled. A file field counts as filled
 * with a picked file or with the file the record already holds (its value).
 */
export function findMissingRequired(
    fields: readonly IFormFieldInfo[],
    values: Readonly<Record<string, unknown>>,
    files: TPickedFiles,
): IFormFieldInfo[] {
    return fields.filter((field) => {
        if (!field.required) {
            return false;
        }
        if (field.isFile) {
            return !(field.name in files) && isBlank(values[field.name]);
        }
        if (field.requiredValue !== null) {
            return String(values[field.name] ?? '') !== field.requiredValue;
        }
        return isBlank(values[field.name]);
    });
}

/** The sentence that names the missing fields (the web renderer's wording). */
export function requiredMessage(missing: readonly IFormFieldInfo[]): string {
    return `Please fill in the following required fields: ${missing.map((field) => field.label).join(', ')}`;
}

/** Field errors for the inputs: each missing field says it is required. */
export function requiredFieldErrors(missing: readonly IFormFieldInfo[]): Record<string, string> {
    return Object.fromEntries(missing.map((field) => [field.name, 'This field is required.']));
}

function text(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
}

/** True when the form differs from what it started with: another value, or a file picked. */
export function isFormDirty(
    initial: Readonly<Record<string, unknown>>,
    current: Readonly<Record<string, unknown>>,
    files: TPickedFiles,
): boolean {
    if (Object.keys(files).length > 0) {
        return true;
    }
    for (const name of new Set([...Object.keys(initial), ...Object.keys(current)])) {
        if (text(initial[name]) !== text(current[name])) {
            return true;
        }
    }
    return false;
}

/**
 * The values of a form as it is about to be sent: what the person typed or
 * chose, and for every input they left alone the value it showed (its default).
 * A browser form sends every field it holds; so does this one.
 */
export function withUntouchedDefaults(
    values: Readonly<Record<string, unknown>>,
    defaults: Readonly<Record<string, string>>,
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...values };
    for (const [name, value] of Object.entries(defaults)) {
        if (result[name] === undefined) {
            result[name] = value;
        }
    }
    return result;
}

/**
 * The form data of a write. File fields are never sent as text (a new file
 * travels as an upload, an unchanged one stays as the server holds it). With
 * `emptyAsNull` a cleared field is sent as `null`, like the web renderer does.
 */
export function buildFormData(
    values: Readonly<Record<string, unknown>>,
    fields: readonly IFormFieldInfo[],
    emptyAsNull: boolean,
): Record<string, unknown> {
    const fileNames = new Set(fields.filter((field) => field.isFile).map((field) => field.name));
    const data: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
        if (fileNames.has(name)) {
            // Contract 4: an explicit remove instruction is JSON in the field value;
            // uploads travel separately. Omit untouched / display-only names.
            if (typeof value === 'string' && value.includes('"remove"')) {
                try {
                    const parsed = JSON.parse(value) as unknown;
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        data[name] = parsed;
                    }
                } catch {
                    // Not an op — leave the stored file alone.
                }
            }
            continue;
        }
        data[name] = emptyAsNull && value === '' ? null : value;
    }
    return data;
}
