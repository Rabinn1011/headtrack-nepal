# HeadTrack Nepal

Bilingual (नेपाली / English), offline-first Android headache diary for the
NIOMH mini-grant feasibility study *"Development and Feasibility Evaluation of
a Simple Bilingual Mobile Headache Diary with Rule-Based Self-Management and
Mental Wellbeing Support in Primary Care"* (PI: Dr. Prajjwol Luitel, Sunthan
Primary Health Centre).

Built with Expo SDK 52 (React Native + TypeScript), per the technical
proposal: expo-sqlite + Drizzle ORM with **SQLCipher encryption at rest**,
i18next resource bundles, local-only notifications, on-device PDF/CSV export.
**The app makes no network requests** — the Android `INTERNET` permission is
explicitly blocked in `app.json`.

## Layout

```
app/                 expo-router screens (Today check-in, Summary, Diary, Settings,
                     onboarding, PIN gate, PHQ-9 modal)
src/components/      shared UI (QuestionCard, ChoicePill, SeveritySlider, PinPad, chart…)
src/db/              drizzle schema, migration runner, typed repository (only data surface)
src/i18n/            ne.json / en.json — every user-facing string lives here
src/rules/           declarative rule engine + PHQ-9 item-9 safety check + tests
src/security/        SQLCipher key management, PIN hashing, encryption self-check
src/export/          clinician PDF, de-identified passphrase-encrypted CSV bundle
src/notifications/   daily local reminder + adherence events
tools/decrypt-export.js   offline decryptor for research exports (Node, no deps)
e2e/                 pre-pilot device test plan (Detox stubbed in .detoxrc.js)
```

## Develop

```bash
npm install --legacy-peer-deps
npm run typecheck   # tsc --noEmit
npm test            # 43 unit/component tests (rules, safety, crypto, CSV, conditional UI)
npx expo start      # run in Expo Go / emulator
```

> **Expo Go caveat:** SQLCipher is not compiled into Expo Go, so in Expo Go the
> database falls back to plaintext and the app logs an
> `encryption_check_failed` app_event (visible in exports). Any real build
> (below) has SQLCipher active. The pilot must use the EAS/preview APK, never
> Expo Go.

## Build the pilot APK

One-time: `npm i -g eas-cli`, `eas login` (free Expo account), then:

```bash
eas build -p android --profile preview
```

This produces a downloadable, installable APK for the 30 study devices.

## Research data export

Settings → *Export research data (CSV)* asks for a passphrase (≥8 chars) and
produces `headtrack_export_<studyID>_<date>.htn.enc` containing three CSVs
(`entries.csv`, `phq9.csv`, `app_events.csv`), AES-256 encrypted. The study
team decrypts offline:

```bash
node tools/decrypt-export.js headtrack_export_HTN-001_2026-07-19.htn.enc "<passphrase>" out/
```

De-identification: only the study ID appears; the free-text notes field never
leaves the device.

## ⚠️ Before the pilot — required human sign-offs

These items are deliberately left for the study team and are **not** finished
engineering work:

1. **Nepali wording review.** The reference UI prototype (`HeadTrackNepal.jsx`)
   was not available when this codebase was generated, so all Nepali copy in
   `src/i18n/ne.json` was drafted fresh. The protocol requires clinical and
   mental-health adviser review of every user-facing string (especially
   `rules.*`, `phq9.safety*`, and `settings.disclaimerBody`) before release.
   English rule messages use the proposal Section 7.5 approved wording verbatim.
2. **Validated Nepali PHQ-9.** `ne.json → phq9.items/options/intro` currently
   carries the English instrument plus an in-app notice. Paste the validated
   Nepali PHQ-9 translation referenced in the protocol — do not re-translate.
3. **Medication-overuse threshold.** The rule ships with the protocol's
   28-day/≥10-day clinical threshold (`src/rules/rules.ts`, constants
   `MOU_WINDOW_DAYS` / `MOU_THRESHOLD_DAYS`) — confirm with the clinical
   adviser; the prototype's scaled-down demo threshold was intentionally not used.
4. **Safety contact.** `phq9.safetyContact` in both language files should name
   the agreed safety-pathway contact (person/number) before deployment.
5. **Device round.** Run `e2e/README.md` on an emulator + ≥2 physical devices,
   including the pull-the-DB-file encryption verification and airplane-mode pass.

## Adherence events

`app_events` logs `app_open`, `enrolled`, `entry_saved`, `entry_edited`,
`entry_duration_ms:<n>`, `reminder_opened`, `reminder_fired` (foreground only —
Android does not wake the JS runtime for delivered notifications; the
fired-vs-opened gap is analysed against scheduled times), `export_pdf`,
`export_csv`, `phq9_completed_<timepoint>`, `phq9_item9_flag`,
`encryption_check_failed`.
