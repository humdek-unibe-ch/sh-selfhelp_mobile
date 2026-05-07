/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Visual chunks for the Accordion style. Right now there's no static
 * styling — everything comes from the CMS via `buildSectionClasses`.
 * The file exists to make the 4-file pattern explicit (vs. embedding
 * an empty StyleSheet inline).
 *
 * Add static fallback styles here if a section ever needs them in
 * lieu of a `css_mobile` value.
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    /** Reserved — populate when a baseline visual is needed. */
    root: {},
});
