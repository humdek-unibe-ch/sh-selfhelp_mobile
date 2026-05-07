/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile style implementation map. Keys come straight from
 * `STYLE_REGISTRY` in `@selfhelp/shared`.
 *
 * Components missing from this map fall back to `UnknownStyle` (visible
 * in dev as a yellow warning, silent in production).
 *
 * Adding a new style:
 *   1. Implement the component in `components/styles/<group>/<Name>/`.
 *   2. Import it here.
 *   3. Register the entry below.
 */

import type { TStyleImplMap } from '@/components/renderer/types';

import { Container } from './layout/Container';
import { Box } from './layout/Box';
import { FlexBox } from './layout/Flex';
import { Group } from './layout/Group';
import { Stack } from './layout/Stack';
import { SimpleGrid } from './layout/SimpleGrid';
import { Grid } from './layout/Grid';
import { GridColumn } from './layout/GridColumn';
import { Space } from './layout/Space';
import { Divider } from './layout/Divider';
import { Paper } from './layout/Paper';
import { Center } from './layout/Center';
import { ScrollAreaStyle } from './layout/ScrollArea';
import { Card } from './layout/Card';
import { CardSegment } from './layout/CardSegment';
import { AspectRatio } from './layout/AspectRatio';
import { BackgroundImage } from './layout/BackgroundImage';

import { Title } from './typography/Title';
import { TextStyle } from './typography/TextStyle';
import { Code } from './typography/Code';
import { Highlight } from './typography/Highlight';
import { Blockquote } from './typography/Blockquote';
import { HtmlTag } from './typography/HtmlTag';
import { Kbd } from './typography/Kbd';
import { Typography } from './typography/Typography';
import { Fieldset } from './typography/Fieldset';
import { Spoiler } from './typography/Spoiler';

import { ImageStyle } from './media/ImageStyle';
import { VideoStyle } from './media/VideoStyle';
import { AudioStyle } from './media/AudioStyle';
import { Figure } from './media/Figure';
import { Carousel } from './media/Carousel/index';

import { Button } from './interactive/Button';
import { Link } from './interactive/Link';
import { ActionIcon } from './interactive/ActionIcon';
import { Alert } from './interactive/Alert';
import { Badge } from './interactive/Badge';
import { Avatar } from './interactive/Avatar';
import { Chip } from './interactive/Chip';
import { Indicator } from './interactive/Indicator';
import { ThemeIcon } from './interactive/ThemeIcon';
import { Notification } from './interactive/Notification';

import { FormLog, FormRecord } from './forms/FormUserInput/index';
import { Input } from './forms/Input';
import { TextInput } from './forms/TextInput';
import { Textarea } from './forms/Textarea';
import { RichTextEditorReadOnly } from './forms/RichTextEditorReadOnly';
import { Select } from './forms/Select';
import { Radio } from './forms/Radio';
import { Checkbox } from './forms/Checkbox';
import { Slider } from './forms/Slider';
import { RangeSlider } from './forms/RangeSlider';
import { DatePicker } from './forms/DatePicker';
import { Switch } from './forms/Switch';
import { Combobox } from './forms/Combobox';
import { ColorInput } from './forms/ColorInput';
import { ColorPicker } from './forms/ColorPicker';
import { FileInput } from './forms/FileInput';
import { NumberInput } from './forms/NumberInput';
import { SegmentedControl } from './forms/SegmentedControl';
import { Rating } from './forms/Rating';
import { Progress } from './forms/Progress';
import { ProgressRoot } from './forms/ProgressRoot';
import { ProgressSection } from './forms/ProgressSection';

import { Accordion } from './composite/Accordion/index';
import { AccordionItem } from './composite/AccordionItem';
import { Tabs } from './composite/Tabs';
import { Tab } from './composite/Tab';
import { Timeline } from './composite/Timeline';
import { ListStyle } from './composite/ListStyle';
import { ListItem } from './composite/ListItem';
import { EntryList } from './composite/EntryList';
import { EntryRecord } from './composite/EntryRecord';
import { EntryRecordDelete } from './composite/EntryRecordDelete';
import { Loop } from './composite/Loop';

import { Login } from './auth/Login';
import { Register } from './auth/Register';
import { Validate } from './auth/Validate';
import { ResetPassword } from './auth/ResetPassword';
import { TwoFactorAuth } from './auth/TwoFactorAuth';
import { Profile } from './auth/Profile';

export const styleImpls: TStyleImplMap = {
    // layout
    container: Container,
    box: Box,
    flex: FlexBox,
    group: Group,
    stack: Stack,
    'simple-grid': SimpleGrid,
    grid: Grid,
    'grid-column': GridColumn,
    space: Space,
    divider: Divider,
    paper: Paper,
    center: Center,
    'scroll-area': ScrollAreaStyle,
    card: Card,
    'card-segment': CardSegment,
    'aspect-ratio': AspectRatio,
    'background-image': BackgroundImage,
    // typography
    title: Title,
    text: TextStyle,
    code: Code,
    highlight: Highlight,
    blockquote: Blockquote,
    'html-tag': HtmlTag,
    kbd: Kbd,
    typography: Typography,
    fieldset: Fieldset,
    spoiler: Spoiler,
    // media
    image: ImageStyle,
    video: VideoStyle,
    audio: AudioStyle,
    figure: Figure,
    carousel: Carousel,
    // interactive
    button: Button,
    link: Link,
    'action-icon': ActionIcon,
    alert: Alert,
    badge: Badge,
    avatar: Avatar,
    chip: Chip,
    indicator: Indicator,
    'theme-icon': ThemeIcon,
    notification: Notification,
    // forms
    'form-log': FormLog,
    'form-record': FormRecord,
    input: Input,
    'text-input': TextInput,
    textarea: Textarea,
    'rich-text-editor': RichTextEditorReadOnly,
    select: Select,
    radio: Radio,
    checkbox: Checkbox,
    slider: Slider,
    'range-slider': RangeSlider,
    datepicker: DatePicker,
    switch: Switch,
    combobox: Combobox,
    'color-input': ColorInput,
    'color-picker': ColorPicker,
    'file-input': FileInput,
    'number-input': NumberInput,
    'segmented-control': SegmentedControl,
    rating: Rating,
    progress: Progress,
    'progress-root': ProgressRoot,
    'progress-section': ProgressSection,
    // composite
    accordion: Accordion,
    'accordion-item': AccordionItem,
    tabs: Tabs,
    tab: Tab,
    timeline: Timeline,
    list: ListStyle,
    'list-item': ListItem,
    entryList: EntryList,
    entryRecord: EntryRecord,
    entryRecordDelete: EntryRecordDelete,
    loop: Loop,
    // auth
    login: Login,
    register: Register,
    validate: Validate,
    resetPassword: ResetPassword,
    twoFactorAuth: TwoFactorAuth,
    profile: Profile,
};
