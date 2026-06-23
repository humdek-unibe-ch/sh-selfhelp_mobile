/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * FormUserInput style — render-only file.
 *
 * The two CMS keywords `form-log` and `form-record` reuse the same
 * component (Mantine on web does the same). The only difference is
 * which submit endpoint runs (`submitForm` vs `updateForm`); that's
 * decided by the `isLog` prop wired from the registry.
 *
 * RF-21: this is a custom composite (not a 1:1 component map), so the mobile
 * form builds its own action row from the shared button knobs
 * (`buttons_*` / `btn_*_color`) that the web Mantine form also
 * reads — same authored config, native rendering.
 */

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colorToHex } from '@selfhelp/shared';

import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

import { FormContext } from '../FormContext';
import type { IFormBaseProps } from './FormUserInput.types';
import { useFormController } from './FormUserInput.hooks';
import { styles } from './FormUserInput.styles';

/** Maps the shared size token to RN padding + font size. */
const SIZE_PADDING: Record<string, { v: number; h: number; font: number }> = {
    xs: { v: 6, h: 12, font: 13 },
    sm: { v: 10, h: 16, font: 14 },
    md: { v: 12, h: 20, font: 16 },
    lg: { v: 14, h: 24, font: 18 },
    xl: { v: 16, h: 28, font: 20 },
};

/** Maps the shared radius token to an RN borderRadius. */
const RADIUS_VALUE: Record<string, number> = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
};

/** Maps the shared button-row position to an RN justifyContent. */
const POSITION_JUSTIFY: Record<string, 'flex-start' | 'center' | 'flex-end' | 'space-between'> = {
    left: 'flex-start',
    'flex-start': 'flex-start',
    center: 'center',
    right: 'flex-end',
    'flex-end': 'flex-end',
    apart: 'space-between',
    'space-between': 'space-between',
};

function FormBase({ section, values, isLog }: IFormBaseProps): React.ReactElement {
    const formName = readField<string>(section, 'name') ?? `form-${section.id}`;
    const saveLabel = useInterpolatedField(section, 'btn_save_label', values) || 'Submit';
    const cancelLabel = useInterpolatedField(section, 'btn_cancel_label', values);
    const successMessage = useInterpolatedField(section, 'alert_success', values);
    const errorMessage = useInterpolatedField(section, 'alert_error', values);
    const cancelUrl = useInterpolatedField(section, 'btn_cancel_url', values);
    const ajax = readBooleanField(section, 'ajax', true);

    // Optional auto-styled heading + localizable alert titles + confirm dialog.
    const formTitle = useInterpolatedField(section, 'title', values);
    const formDescription = useInterpolatedField(section, 'description', values);
    const alertSuccessTitle = useInterpolatedField(section, 'alert_success_title', values) || 'Success';
    const alertErrorTitle = useInterpolatedField(section, 'alert_error_title', values) || 'Error';
    const confirmSubmit = readBooleanField(section, 'confirm_submit', false);
    const confirmMessage = useInterpolatedField(section, 'confirm_message', values) || 'Are you sure you want to submit?';
    const [confirmOpen, setConfirmOpen] = useState(false);
    const colors = useAppColors();

    // RF-21 — shared button knobs (same fields the web Mantine form reads).
    // The authored value is a Mantine token (the seed default is `blue`), so it
    // must go through `colorToHex` — passing it raw to RN renders the literal CSS
    // colour (e.g. `blue` => #0000FF). Falls back to the theme primary.
    const saveColor = colorToHex(readField<string>(section, 'btn_save_color') ?? '', colors.isDark ? 5 : 6) || colors.primary;
    const cancelColorRaw = readField<string>(section, 'btn_cancel_color');
    const cancelColor = cancelColorRaw ? colorToHex(cancelColorRaw, colors.isDark ? 5 : 6) : undefined;
    const order = readField<string>(section, 'buttons_order') || 'save-cancel';
    const position = readField<string>(section, 'buttons_position') || 'space-between';
    const size = readField<string>(section, 'buttons_size') || 'sm';
    const radius = readField<string>(section, 'buttons_radius') || 'sm';
    const variant = readField<string>(section, 'buttons_variant') || 'filled';

    // The backend requires `page_id` to run the page-access check on submit;
    // `PageRenderer` seeds it into the interpolation values (same as `register`).
    const pageId = typeof values.page_id === 'number' ? values.page_id : Number(values.page_id);

    const { ctx, isSubmitting, resultMessage, resultIsError, onSubmit, onCancel } = useFormController({
        sectionId: section.id,
        pageId,
        formName,
        isLog,
        successMessage,
        errorMessage,
        cancelUrl,
        ajax,
    });

    const pad = SIZE_PADDING[size] ?? SIZE_PADDING.sm;
    const br = RADIUS_VALUE[radius] ?? RADIUS_VALUE.sm;
    const justifyContent = POSITION_JUSTIFY[position] ?? 'space-between';
    const isFilled = variant === 'filled';

    const submitButton = (
        <Pressable
            key="submit"
            onPress={() => {
                if (confirmSubmit) {
                    setConfirmOpen(true);
                } else {
                    void onSubmit();
                }
            }}
            disabled={isSubmitting}
            style={{
                paddingVertical: pad.v,
                paddingHorizontal: pad.h,
                borderRadius: br,
                backgroundColor: isFilled ? saveColor : 'transparent',
                borderWidth: isFilled ? 0 : 1,
                borderColor: saveColor,
                opacity: isSubmitting ? 0.6 : 1,
            }}
        >
            <Text style={{ color: isFilled ? '#fff' : saveColor, fontWeight: '600', fontSize: pad.font }}>{saveLabel}</Text>
        </Pressable>
    );

    const cancelButton = cancelLabel ? (
        <Pressable
            key="cancel"
            onPress={onCancel}
            style={{
                paddingVertical: pad.v,
                paddingHorizontal: pad.h,
                borderRadius: br,
                borderWidth: 1,
                borderColor: cancelColor || colors.border,
            }}
        >
            <Text style={{ color: cancelColor || colors.text, fontWeight: '600', fontSize: pad.font }}>{cancelLabel}</Text>
        </Pressable>
    ) : null;

    // `save-cancel` => save first; `cancel-save` => cancel first (matches the web order knob).
    const actionButtons = order === 'cancel-save' ? [cancelButton, submitButton] : [submitButton, cancelButton];

    return (
        <View className={buildSectionClasses(section)}>
            {(formTitle || formDescription) ? (
                <View style={{ marginBottom: 12, gap: 4 }}>
                    {formTitle ? (
                        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{formTitle}</Text>
                    ) : null}
                    {formDescription ? (
                        <Text style={{ fontSize: 14, color: colors.textMuted }}>{formDescription}</Text>
                    ) : null}
                </View>
            ) : null}

            <FormContext.Provider value={ctx}>
                <Children sections={(section as { children?: never }).children} values={values} />
            </FormContext.Provider>

            <View style={[styles.actions, { justifyContent }]}>{actionButtons}</View>

            {resultMessage ? (
                <View style={{ marginTop: 8, gap: 2 }}>
                    <Text style={[styles.resultBase, resultIsError ? styles.resultError : styles.resultSuccess, { fontWeight: '700' }]}>
                        {resultIsError ? alertErrorTitle : alertSuccessTitle}
                    </Text>
                    <Text style={[styles.resultBase, resultIsError ? styles.resultError : styles.resultSuccess]}>
                        {resultMessage}
                    </Text>
                </View>
            ) : null}

            <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
                <Pressable
                    onPress={() => setConfirmOpen(false)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                >
                    <View
                        onStartShouldSetResponder={() => true}
                        style={{ width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 12, padding: 20, gap: 16 }}
                    >
                        <Text style={{ color: colors.text, fontSize: 16 }}>{confirmMessage}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                            <Pressable onPress={() => setConfirmOpen(false)}>
                                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: pad.font }}>{cancelLabel || 'Cancel'}</Text>
                            </Pressable>
                            <Pressable onPress={() => { setConfirmOpen(false); void onSubmit(); }}>
                                <Text style={{ color: saveColor, fontWeight: '600', fontSize: pad.font }}>{saveLabel}</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

export function FormLog(props: IStyleProps): React.ReactElement {
    return <FormBase {...props} isLog />;
}

export function FormRecord(props: IStyleProps): React.ReactElement {
    return <FormBase {...props} isLog={false} />;
}
