/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type {
    IFormListControl,
    IFormListState,
    IFormListUrlState,
    TFormListUrlChange,
} from '@selfhelp/shared';

import { useDebouncedCommit } from './FormList.hooks';
import { ListButton } from './FormListPrimitives';
import { MIN_TOUCH, styles, type IListPalette } from './FormList.styles';
import {
    activeFilterCount,
    isNarrowed,
    isSearchTermUsable,
    joinRange,
    multiValues,
    normalizeBooleanFilter,
    optionLabel,
    selectedOptionsText,
    splitRange,
    toggleMultiValue,
    type TFormListText,
} from './FormList.logic';

interface IFormListToolbarProps {
    state: IFormListState;
    urlState: IFormListUrlState;
    onChange: (change: TFormListUrlChange) => void;
    /** The label of the add button (author text in the visitor's language). */
    addLabel: string;
    /** The search placeholder (author text). */
    searchLabel: string;
    /** Show the add button (an entry list the visitor may add to). */
    canCreate: boolean;
    onAdd: () => void;
    palette: IListPalette;
    text: TFormListText;
}

interface IStyledProps {
    palette: IListPalette;
    text: TFormListText;
}

function SearchBox({ urlState, onChange, searchLabel, palette, text }: Pick<IFormListToolbarProps, 'urlState' | 'onChange' | 'searchLabel' | 'palette' | 'text'>): React.ReactElement {
    const commit = useCallback((value: string) => {
        const term = value.trim();
        if (term !== '' && !isSearchTermUsable(term)) {
            return;
        }
        onChange({ type: 'search', q: term === '' ? null : term });
    }, [onChange]);
    const { text: typed, setText, flush } = useDebouncedCommit(urlState.q ?? '', commit);
    const tooShort = typed.trim() !== '' && !isSearchTermUsable(typed.trim());

    return (
        <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
            <View
                accessibilityRole="search"
                style={[styles.searchBox, { borderColor: tooShort ? palette.dangerText : palette.border, backgroundColor: palette.surface }]}
            >
                <TextInput
                    value={typed}
                    onChangeText={setText}
                    placeholder={searchLabel}
                    placeholderTextColor={palette.textFaint}
                    accessibilityLabel={searchLabel}
                    returnKeyType="search"
                    onSubmitEditing={flush}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={100}
                    style={[styles.searchInput, { color: palette.text }]}
                    testID="form-list-search"
                />
                {typed !== '' ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={text.clearSearch}
                        onPress={() => {
                            setText('');
                            onChange({ type: 'search', q: null });
                        }}
                        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH - 2, alignItems: 'center', justifyContent: 'center' }}
                        testID="form-list-search-clear"
                    >
                        <Text style={{ fontSize: 20, color: palette.textMuted }}>{'\u00d7'}</Text>
                    </Pressable>
                ) : null}
            </View>
            {tooShort ? (
                <Text accessibilityLiveRegion="polite" style={[styles.inputError, { color: palette.dangerText }]}>
                    {text.searchShort}
                </Text>
            ) : null}
        </View>
    );
}

interface IControlProps extends IStyledProps {
    control: IFormListControl;
    value: string;
    onValue: (value: string | null) => void;
}

function TextControl({ control, value, onValue, palette }: IControlProps): React.ReactElement {
    const commit = useCallback((next: string) => onValue(next.trim() === '' ? null : next.trim()), [onValue]);
    const { text: typed, setText, flush } = useDebouncedCommit(value, commit);
    return (
        <View style={styles.controlBlock}>
            <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{control.label}</Text>
            <TextInput
                value={typed}
                onChangeText={setText}
                onSubmitEditing={flush}
                accessibilityLabel={control.label}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.controlInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]}
                testID={`form-list-control-${control.id}`}
            />
        </View>
    );
}

function BooleanControl({ control, value, onValue, palette, text }: IControlProps): React.ReactElement {
    const current = normalizeBooleanFilter(value);
    const choices: { value: '' | '1' | '0'; label: string }[] = [
        { value: '', label: text.anyValue },
        { value: '1', label: text.yes },
        { value: '0', label: text.no },
    ];
    return (
        <View style={styles.controlBlock} accessibilityRole="radiogroup" accessibilityLabel={control.label}>
            <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{control.label}</Text>
            <View style={styles.segmentRow}>
                {choices.map((choice) => (
                    <ListButton
                        key={choice.value === '' ? 'any' : choice.value}
                        label={choice.label}
                        accessibilityLabel={`${control.label}: ${choice.label}`}
                        selected={current === choice.value}
                        onPress={() => onValue(choice.value === '' ? null : choice.value)}
                        palette={palette}
                        testID={`form-list-control-${control.id}-${choice.value === '' ? 'any' : choice.value}`}
                    />
                ))}
            </View>
        </View>
    );
}

function RangeControl({ control, value, onValue, kind, palette, text }: IControlProps & { kind: 'date' | 'number' }): React.ReactElement {
    const [from, to] = splitRange(value);
    const commitFrom = useCallback((next: string) => onValue(joinRange(next.trim(), to)), [onValue, to]);
    const commitTo = useCallback((next: string) => onValue(joinRange(from, next.trim())), [onValue, from]);
    const fromField = useDebouncedCommit(from, commitFrom);
    const toField = useDebouncedCommit(to, commitTo);
    const keyboardType = kind === 'number' ? 'numeric' : 'numbers-and-punctuation';
    const placeholder = kind === 'date' ? 'YYYY-MM-DD' : undefined;

    return (
        <View style={styles.controlBlock} accessibilityRole="none" accessibilityLabel={control.label}>
            <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{control.label}</Text>
            <View style={styles.rangeRow}>
                <View style={styles.rangeCell}>
                    <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{text.from}</Text>
                    <TextInput
                        value={fromField.text}
                        onChangeText={fromField.setText}
                        onSubmitEditing={fromField.flush}
                        accessibilityLabel={`${control.label} ${text.from}`}
                        keyboardType={keyboardType}
                        placeholder={placeholder}
                        placeholderTextColor={palette.textFaint}
                        autoCorrect={false}
                        style={[styles.controlInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]}
                        testID={`form-list-control-${control.id}-from`}
                    />
                </View>
                <View style={styles.rangeCell}>
                    <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{text.to}</Text>
                    <TextInput
                        value={toField.text}
                        onChangeText={toField.setText}
                        onSubmitEditing={toField.flush}
                        accessibilityLabel={`${control.label} ${text.to}`}
                        keyboardType={keyboardType}
                        placeholder={placeholder}
                        placeholderTextColor={palette.textFaint}
                        autoCorrect={false}
                        style={[styles.controlInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }]}
                        testID={`form-list-control-${control.id}-to`}
                    />
                </View>
            </View>
        </View>
    );
}

interface IOptionPickerProps extends IStyledProps {
    control: IFormListControl;
    value: string;
    multi: boolean;
    onValue: (value: string | null) => void;
    onClose: () => void;
}

/** The choices of a select control in a sheet over the screen: large rows, one tap per choice. */
function OptionPicker({ control, value, multi, onValue, onClose, palette, text }: IOptionPickerProps): React.ReactElement {
    const chosen = multiValues(value);
    const options = control.options ?? [];

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.scrim, { backgroundColor: palette.backdrop }]}>
                <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: palette.surface }]}>
                    <Text accessibilityRole="header" style={[styles.dialogTitle, { color: palette.text }]}>{control.label}</Text>
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                        <Pressable
                            accessibilityRole={multi ? 'checkbox' : 'radio'}
                            accessibilityState={{ checked: chosen.length === 0 }}
                            accessibilityLabel={`${control.label}: ${text.anyValue}`}
                            onPress={() => { onValue(null); if (!multi) onClose(); }}
                            style={[styles.optionRow, { borderColor: palette.border }]}
                            testID={`form-list-option-${control.id}-any`}
                        >
                            <Text style={{ color: palette.text, fontSize: 16, flexShrink: 1 }}>
                                {chosen.length === 0 ? '\u2713 ' : ''}{text.anyValue}
                            </Text>
                        </Pressable>
                        {options.map((option) => {
                            const selected = chosen.includes(option.value);
                            return (
                                <Pressable
                                    key={option.value}
                                    accessibilityRole={multi ? 'checkbox' : 'radio'}
                                    accessibilityState={{ checked: selected }}
                                    accessibilityLabel={optionLabel(option)}
                                    onPress={() => {
                                        if (multi) {
                                            onValue(toggleMultiValue(value, option.value));
                                        } else {
                                            onValue(option.value);
                                            onClose();
                                        }
                                    }}
                                    style={[styles.optionRow, { borderColor: palette.border }]}
                                    testID={`form-list-option-${control.id}-${option.value}`}
                                >
                                    <Text style={{ color: palette.text, fontSize: 16, flexShrink: 1 }}>
                                        {selected ? '\u2713 ' : ''}{optionLabel(option)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                    <View style={styles.dialogActions}>
                        <ListButton label={text.done} tone="primary" onPress={onClose} palette={palette} testID="form-list-option-done" />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function SelectControl({ control, value, onValue, multi, palette, text }: IControlProps & { multi: boolean }): React.ReactElement {
    const [open, setOpen] = useState(false);
    const shown = selectedOptionsText(control.options, value);

    return (
        <View style={styles.controlBlock}>
            <Text style={[styles.controlLabel, { color: palette.textMuted }]}>{control.label}</Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${control.label}: ${shown === '' ? text.anyValue : shown}`}
                onPress={() => setOpen(true)}
                style={[styles.controlPicker, { borderColor: palette.border, backgroundColor: palette.surface }]}
                testID={`form-list-control-${control.id}`}
            >
                <Text style={{ color: shown === '' ? palette.textMuted : palette.text, fontSize: 16 }}>
                    {shown === '' ? text.anyValue : shown}
                </Text>
            </Pressable>
            {open ? (
                <OptionPicker
                    control={control}
                    value={value}
                    multi={multi}
                    onValue={onValue}
                    onClose={() => setOpen(false)}
                    palette={palette}
                    text={text}
                />
            ) : null}
        </View>
    );
}

function Control({ control, urlState, onChange, palette, text }: IStyledProps & { control: IFormListControl; urlState: IFormListUrlState; onChange: IFormListToolbarProps['onChange'] }): React.ReactElement | null {
    const value = urlState.filters[control.id] ?? '';
    const onValue = useCallback(
        (next: string | null) => onChange({ type: 'filter', id: control.id, value: next }),
        [onChange, control.id],
    );
    const shared = { control, value, onValue, palette, text };

    switch (control.type) {
        case 'text':
            return <TextControl {...shared} />;
        case 'select':
            return <SelectControl {...shared} multi={false} />;
        case 'multi_select':
            return <SelectControl {...shared} multi />;
        case 'boolean':
            return <BooleanControl {...shared} />;
        case 'date_range':
            return <RangeControl {...shared} kind="date" />;
        case 'number_range':
            return <RangeControl {...shared} kind="number" />;
        default:
            return null;
    }
}

/** Search, the visitor's controls, the reset button and the add button of a list. */
export function FormListToolbar({
    state,
    urlState,
    onChange,
    addLabel,
    searchLabel,
    canCreate,
    onAdd,
    palette,
    text,
}: IFormListToolbarProps): React.ReactElement | null {
    const filterCount = activeFilterCount(urlState);
    const [showControls, setShowControls] = useState(filterCount > 0);
    const narrowed = isNarrowed(urlState);
    const showSearch = state.capabilities.search;
    const hasControls = state.controls.length > 0;

    if (!showSearch && !hasControls && !canCreate && !narrowed) {
        return null;
    }

    return (
        <View style={styles.toolbar} testID="form-list-toolbar">
            {showSearch || canCreate ? (
                <View style={styles.toolbarRow}>
                    {showSearch ? (
                        <SearchBox urlState={urlState} onChange={onChange} searchLabel={searchLabel} palette={palette} text={text} />
                    ) : null}
                    {canCreate ? (
                        <ListButton label={addLabel} tone="primary" onPress={onAdd} palette={palette} testID="form-list-add" />
                    ) : null}
                </View>
            ) : null}
            {hasControls ? (
                <ListButton
                    label={filterCount > 0 ? `${text.filters} (${filterCount})` : text.filters}
                    accessibilityLabel={filterCount > 0 ? `${text.filters}, ${filterCount}` : text.filters}
                    selected={showControls}
                    onPress={() => setShowControls((open) => !open)}
                    palette={palette}
                    style={{ alignSelf: 'flex-start' }}
                    testID="form-list-filters-toggle"
                />
            ) : null}
            {hasControls && showControls ? (
                <View style={{ gap: 10 }} testID="form-list-controls">
                    {state.controls.map((control) => (
                        <Control key={control.id} control={control} urlState={urlState} onChange={onChange} palette={palette} text={text} />
                    ))}
                </View>
            ) : null}
            {narrowed ? (
                <ListButton
                    label={text.resetFilters}
                    onPress={() => onChange({ type: 'reset' })}
                    palette={palette}
                    style={{ alignSelf: 'flex-start' }}
                    testID="form-list-reset"
                />
            ) : null}
        </View>
    );
}
