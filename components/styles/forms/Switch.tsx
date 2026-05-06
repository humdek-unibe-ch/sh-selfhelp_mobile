import { Switch as RNSwitch, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Switch({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const onValue = readField<string>(section, 'mantine_switch_on_value') ?? '1';
    const offValue = readField<string>(section, 'mantine_switch_off_value') ?? '0';
    const initial = readField<string>(section, 'value') ?? offValue;
    const disabled = readBooleanField(section, 'disabled', false);
    const { value, error, setValue } = useFieldBinding(name, initial);
    const isOn = value === onValue;

    return (
        <FieldShell label={label} description={description} error={error} className={buildSectionClasses(section)}>
            <View style={{ alignItems: 'flex-start' }}>
                <RNSwitch value={isOn} onValueChange={(next) => setValue(next ? onValue : offValue)} disabled={disabled} />
            </View>
        </FieldShell>
    );
}
