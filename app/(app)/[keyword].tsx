/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { CmsPageScreen } from '@/components/renderer/CmsPageScreen';
import { useLocalSearchParams } from 'expo-router';

export default function PageByKeywordScreen(): React.ReactElement {
    const { keyword } = useLocalSearchParams<{ keyword: string }>();

    if (!keyword) return <ErrorScreen title="Missing keyword" />;
    return <CmsPageScreen keyword={keyword} />;
}
