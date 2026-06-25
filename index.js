/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
// Custom entry point. The web-preview boot side-effect MUST evaluate before
// `expo-router/entry` (which, on web, renders synchronously and reads
// `window.location` as it evaluates). ES module evaluation runs imported modules
// in source order, so importing the boot module first guarantees the one-time
// `previewSession` code is stripped from the URL before expo-router's web
// linking sees it. No-op on native. See `config/webPreviewBoot.ts`.
import './config/webPreviewBoot';
import 'expo-router/entry';
