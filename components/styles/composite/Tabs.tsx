/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { createContext, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

interface ITabsCtx {
    active: number;
    setActive: (i: number) => void;
}

export const TabsContext = createContext<ITabsCtx | null>(null);
export function useTabsContext(): ITabsCtx | null {
    return useContext(TabsContext);
}

export function Tabs({ section, values }: IStyleProps): React.ReactElement {
    const [active, setActive] = useState(0);
    const ctx = useMemo<ITabsCtx>(() => ({ active, setActive }), [active]);
    return (
        <View className={buildSectionClasses(section)}>
            <TabsContext.Provider value={ctx}>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e9ecef' }}>
                    <Children sections={(section as { children?: never }).children} values={values} />
                </View>
            </TabsContext.Provider>
        </View>
    );
}
