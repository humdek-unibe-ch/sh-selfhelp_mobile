# Changelog

## 0.1.0

### App foundation
- Started the SelfHelp mobile app as a standalone Expo project.
- Set up the core app structure so the project can run as a mobile app and a browser preview.
- Added the main provider flow for app startup, loading state, and error handling.

### Navigation and content
- Added the main app shell with header, menu, page navigation, and profile area.
- Wired the app to load CMS-driven pages and menus from the backend.
- Added support for opening pages directly by URL, so refreshes and shared links can land on the right screen.

### Look and feel
- Added the first round of reusable styles and screen layouts.
- Created the first reusable style library for:
  auth screens (`Login`, `Profile`, `Register`, `ResetPassword`, `TwoFactorAuth`, `Validate`),
  layout blocks (`Box`, `Card`, `Container`, `Flex`, `Grid`, `Paper`, `ScrollArea`, `Stack`, `SimpleGrid`, `Space`, `Divider`, `Center`, `Group`, `AspectRatio`, `BackgroundImage`),
  interactive UI (`Button`, `Link`, `ActionIcon`, `Alert`, `Avatar`, `Badge`, `Chip`, `Indicator`, `Notification`, `ThemeIcon`),
  typography (`Title`, `TextStyle`, `Typography`, `Blockquote`, `Code`, `Fieldset`, `Highlight`, `HtmlTag`, `Kbd`, `Spoiler`),
  media (`Figure`, `ImageStyle`, `VideoStyle`, `AudioStyle`, `Carousel`),
  composite content (`Accordion`, `AccordionItem`, `Tabs`, `Tab`, `Timeline`, `EntryList`, `EntryRecord`, `EntryRecordDelete`, `Loop`, `ListItem`, `ListStyle`),
  and forms (`TextInput`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Radio`, `Select`, `Combobox`, `DatePicker`, `NumberInput`, `ColorInput`, `ColorPicker`, `RangeSlider`, `Slider`, `Rating`, `SegmentedControl`, `Progress`, `ProgressRoot`, `ProgressSection`, `FileInput`, `RichTextEditorReadOnly`, `FormUserInput`).
- Introduced the phone preview frame for the web version so editors can see a mobile-like layout in the browser.
- Added loading, error, and debug surfaces to make the app easier to use and review during development.

### Platforms and builds
- Prepared the project for iOS, Android, and web preview.
- Added local run scripts plus build/update commands for development, preview, and production flows.
- Added instance/build configuration so different environments can point to different backends cleanly.

### Session and backend connection
- Added login, logout, refresh-token restore, and session bootstrap so users can come back after reload.
- Improved how the app remembers the selected backend in preview/dev mode.
- Added safer server switching so changing backend clears the old session and reloads the app state cleanly.

### Live updates
- Added live ACL/session update support so app permissions and menus can refresh when backend access changes.
- Split the live update path by platform:
  native apps use direct authenticated subscriptions, while web preview uses browser-friendly cookie-based subscriptions.
- Improved refresh and remount handling to reduce stuck startup loops during browser reloads.
