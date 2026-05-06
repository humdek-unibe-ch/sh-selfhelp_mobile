import { Select } from './Select';
import type { IStyleProps } from '@/components/renderer/types';

/** Combobox on web is searchable Select; on mobile we re-use Select for v1. */
export function Combobox(props: IStyleProps): React.ReactElement {
    return <Select {...props} />;
}
