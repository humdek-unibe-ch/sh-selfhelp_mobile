import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readStringField } from '@/components/renderer/useField';

export function Kbd({ section }: IStyleProps): React.ReactElement {
    const label = readStringField(section, 'label');
    return (
        <Text
            className={buildSectionClasses(section)}
            style={{
                fontFamily: 'Courier',
                backgroundColor: '#f8f9fa',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: '#dee2e6',
                fontSize: 13,
            }}
        >
            {label}
        </Text>
    );
}
