/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Shared lucide icon registry + resolver for CMS-driven icon fields.
 *
 * Two icon naming schemes reach the mobile renderer:
 *  - the curated `MOBILE_ICON_SET` (lucide PascalCase, e.g. `CircleCheck`)
 *    used by page `mobile_icon` and the admin picker, and
 *  - Tabler names (e.g. `IconCircleCheck`) authored in `web_left_icon` /
 *    `left_icon` fields and in shipped example bundles.
 *
 * `resolveGlyphIcon` accepts both: exact lucide names hit the registry
 * directly, Tabler names are mapped via the `Icon` prefix + alias table.
 * Unknown names return `null` so callers can fall back to a text glyph —
 * but never render a raw `IconSomething` string to the user.
 *
 * All lucide components are imported STATICALLY so Metro only bundles the
 * icons we actually ship. The `MOBILE_ICON_SET` names in `@selfhelp/shared`
 * must all exist in `GLYPH_ICONS` (PageMenuIcon relies on it).
 */

import {
    Activity,
    ArrowRight,
    Award,
    Bell,
    BellRing,
    Book,
    BookOpen,
    Bookmark,
    Box,
    Briefcase,
    Building,
    Calendar,
    ChartBar,
    ChartLine,
    ChartPie,
    Circle,
    CircleCheck,
    CircleQuestionMark,
    ClipboardList,
    Compass,
    CreditCard,
    Database,
    ExternalLink,
    FileText,
    Files,
    Flag,
    Folder,
    Globe,
    GraduationCap,
    Heart,
    HeartHandshake,
    House,
    Image,
    Info,
    Languages,
    LayoutDashboard,
    LayoutGrid,
    LifeBuoy,
    List,
    Lock,
    Mail,
    Map,
    MapPin,
    Menu,
    MessageSquare,
    Music,
    Newspaper,
    Package,
    Phone,
    Puzzle,
    Quote,
    Route,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingCart,
    Smartphone,
    Sparkles,
    Star,
    Stethoscope,
    User,
    Users,
    Video,
} from 'lucide-react-native';

export type TGlyphIconComponent = React.ComponentType<{ size?: number; color?: string }>;

/** Lucide components by their canonical lucide (PascalCase) name. */
export const GLYPH_ICONS: Record<string, TGlyphIconComponent> = {
    Activity,
    ArrowRight,
    Award,
    Bell,
    BellRing,
    Book,
    BookOpen,
    Bookmark,
    Box,
    Briefcase,
    Building,
    Calendar,
    ChartBar,
    ChartLine,
    ChartPie,
    Circle,
    CircleCheck,
    CircleQuestionMark,
    ClipboardList,
    Compass,
    CreditCard,
    Database,
    ExternalLink,
    FileText,
    Files,
    Flag,
    Folder,
    Globe,
    GraduationCap,
    Heart,
    HeartHandshake,
    House,
    Image,
    Info,
    Languages,
    LayoutDashboard,
    LayoutGrid,
    LifeBuoy,
    List,
    Lock,
    Mail,
    Map,
    MapPin,
    Menu,
    MessageSquare,
    Music,
    Newspaper,
    Package,
    Phone,
    Puzzle,
    Quote,
    Route,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingCart,
    Smartphone,
    Sparkles,
    Star,
    Stethoscope,
    User,
    Users,
    Video,
};

/**
 * Tabler → lucide name overrides for icons whose stripped name (`IconX` → `X`)
 * does not match a lucide export. Only names that differ need an entry —
 * `IconCircleCheck` → `CircleCheck` already resolves via the registry.
 */
const TABLER_ALIASES: Record<string, string> = {
    BellRinging: 'BellRing',
    ChartDots: 'ChartLine',
    DeviceMobile: 'Smartphone',
    Home: 'House',
    InfoCircle: 'Info',
    Language: 'Languages',
    Lifebuoy: 'LifeBuoy',
    News: 'Newspaper',
    QuestionMark: 'CircleQuestionMark',
    School: 'GraduationCap',
    ShieldLock: 'ShieldCheck',
    UsersGroup: 'Users',
};

/**
 * Resolves an icon field value (curated lucide name or Tabler `Icon*` name)
 * to a lucide component, or `null` when it isn't a known icon name (e.g. an
 * emoji/character glyph, which the caller should render as text).
 */
export function resolveGlyphIcon(name: string | null | undefined): TGlyphIconComponent | null {
    if (!name) return null;
    const direct = GLYPH_ICONS[name];
    if (direct) return direct;
    if (name.startsWith('Icon') && name.length > 4) {
        const stripped = name.slice(4);
        return GLYPH_ICONS[TABLER_ALIASES[stripped] ?? stripped] ?? null;
    }
    return null;
}

/** True when the value looks like an icon NAME (not a text/emoji glyph). */
export function looksLikeIconName(name: string | null | undefined): boolean {
    return Boolean(name && /^[A-Z][A-Za-z0-9]+$/.test(name) && name.length > 2);
}
