/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Page navigation icon.
 *
 * Draws a page's curated `mobile_icon` (a lucide PascalCase name from the
 * shared `MOBILE_ICON_SET`) with `lucide-react-native`. When a page has no
 * `mobile_icon` — or an unknown value — we fall back to the single-character
 * glyph hint (`iconForPage`) so every menu entry still shows something.
 *
 * The curated lucide components are imported STATICALLY (not via a namespace
 * import) so Metro only bundles the icons we actually use. This map MUST stay
 * aligned with `MOBILE_ICON_SET` in `@selfhelp/shared`: the shared set is the
 * single source of truth for the NAMES, this map provides the matching RN
 * components (so the admin picker and the renderer can never drift).
 */

import { Text } from 'react-native';
import type { IPageItem } from '@selfhelp/shared';
import { isMobileIconName } from '@selfhelp/shared';
import {
    Circle,
    House,
    LayoutDashboard,
    User,
    Users,
    Settings,
    FileText,
    Files,
    Folder,
    Info,
    CircleQuestionMark,
    Mail,
    Phone,
    Calendar,
    Bell,
    Search,
    Star,
    Heart,
    Bookmark,
    Map,
    MapPin,
    Image,
    Video,
    Music,
    ShoppingCart,
    CreditCard,
    ChartBar,
    ChartPie,
    Activity,
    Shield,
    Lock,
    Globe,
    Compass,
    Flag,
    Award,
    Briefcase,
    Building,
    BookOpen,
    MessageSquare,
    ClipboardList,
    CircleCheck,
    List,
    LayoutGrid,
    Menu,
    Database,
} from 'lucide-react-native';

import { iconForPage } from './navigationUtils';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const ICONS: Record<string, IconComponent> = {
    Circle,
    House,
    LayoutDashboard,
    User,
    Users,
    Settings,
    FileText,
    Files,
    Folder,
    Info,
    CircleQuestionMark,
    Mail,
    Phone,
    Calendar,
    Bell,
    Search,
    Star,
    Heart,
    Bookmark,
    Map,
    MapPin,
    Image,
    Video,
    Music,
    ShoppingCart,
    CreditCard,
    ChartBar,
    ChartPie,
    Activity,
    Shield,
    Lock,
    Globe,
    Compass,
    Flag,
    Award,
    Briefcase,
    Building,
    BookOpen,
    MessageSquare,
    ClipboardList,
    CircleCheck,
    List,
    LayoutGrid,
    Menu,
    Database,
};

interface IPageMenuIconProps {
    page: IPageItem;
    size?: number;
    color?: string;
}

export function PageMenuIcon({ page, size = 22, color }: IPageMenuIconProps): React.ReactElement {
    if (isMobileIconName(page.mobile_icon)) {
        const Cmp = ICONS[page.mobile_icon] ?? Circle;
        return <Cmp size={size} color={color} />;
    }

    return (
        <Text
            style={{
                width: size,
                textAlign: 'center',
                color,
                fontWeight: '700',
                fontSize: Math.round(size * 0.7),
            }}
        >
            {iconForPage(page)}
        </Text>
    );
}
