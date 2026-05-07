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
 */

import { Pressable, Text, View } from 'react-native';

import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';

import { FormContext } from '../FormContext';
import type { IFormBaseProps } from './FormUserInput.types';
import { useFormController } from './FormUserInput.hooks';
import { styles } from './FormUserInput.styles';

function FormBase({ section, values, isLog }: IFormBaseProps): React.ReactElement {
    const formName = readField<string>(section, 'name') ?? `form-${section.id}`;
    const saveLabel = useInterpolatedField(section, 'btn_save_label', values) || 'Submit';
    const cancelLabel = useInterpolatedField(section, 'btn_cancel_label', values);
    const successMessage = useInterpolatedField(section, 'alert_success', values);
    const errorMessage = useInterpolatedField(section, 'alert_error', values);
    const cancelUrl = useInterpolatedField(section, 'btn_cancel_url', values);
    const ajax = readBooleanField(section, 'ajax', true);

    const { ctx, isSubmitting, resultMessage, resultIsError, onSubmit, onCancel } = useFormController({
        sectionId: section.id,
        formName,
        isLog,
        successMessage,
        errorMessage,
        cancelUrl,
        ajax,
    });

    return (
        <View className={buildSectionClasses(section)}>
            <FormContext.Provider value={ctx}>
                <Children sections={(section as { children?: never }).children as never} values={values} />
            </FormContext.Provider>

            <View style={styles.actions}>
                {cancelLabel ? (
                    <Pressable onPress={onCancel} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>{cancelLabel}</Text>
                    </Pressable>
                ) : null}
                <Pressable
                    onPress={() => {
                        void onSubmit();
                    }}
                    disabled={isSubmitting}
                    style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
                >
                    <Text style={styles.submitText}>{saveLabel}</Text>
                </Pressable>
            </View>

            {resultMessage ? (
                <Text style={[styles.resultBase, resultIsError ? styles.resultError : styles.resultSuccess]}>
                    {resultMessage}
                </Text>
            ) : null}
        </View>
    );
}

export function FormLog(props: IStyleProps): React.ReactElement {
    return <FormBase {...props} isLog />;
}

export function FormRecord(props: IStyleProps): React.ReactElement {
    return <FormBase {...props} isLog={false} />;
}
