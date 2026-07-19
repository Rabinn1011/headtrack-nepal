# End-to-end (device) test plan — pre-pilot

Detox is stubbed (`.detoxrc.js`) and intentionally not active yet. Before the
30-device pilot, run this suite on an emulator **and at least two physical
low/mid-range Android devices** (proposal Section 10).

## Required device tests

1. **Database encryption (the real check).** With the app installed from the
   EAS `preview` APK (SQLCipher active):
   - complete onboarding, save one entry;
   - `adb pull` the file `files/SQLite/headtrack.db` from the app sandbox
     (requires a debuggable build) or use the in-app self-check event log;
   - assert the first 16 bytes are **not** `SQLite format 3\0`;
   - open the file with plain `sqlite3` → must fail with
     "file is not a database";
   - confirm the app itself opens it fine (key comes from secure store).
   The Jest suite already covers the header-check logic
   (`src/security/__tests__/dbCheck.test.ts`) and the app logs
   `encryption_check_failed` at startup if the file is ever plaintext.
2. **Airplane-mode run.** Enable airplane mode → full check-in, summary,
   diary, settings, PDF export, CSV export. Everything must work; the app
   also ships with the Android INTERNET permission blocked.
3. **Instant language switch.** Toggle Nepali ⇄ English on every screen; no
   restart, no untranslated strings, Devanagari renders on low-end devices.
4. **Conditional fields.** "Yes" reveals headache details; "No" hides them;
   sleep/stress always present.
5. **Already-logged flow.** Save today → kill app → reopen → summary card
   with Edit appears instead of the form.
6. **Reminder.** Set a reminder 2 minutes ahead, background the app, confirm
   delivery; open from the notification and verify a `reminder_opened`
   app_event row. Repeat with battery optimisation enabled to document OEM
   behaviour (Xiaomi/Samsung/Oppo/Vivo).
7. **PIN gate.** Kill and reopen → PIN required; wrong PIN rejected.
8. **PHQ-9 safety.** Enter item 9 > 0 → the clinician-contact prompt must
   appear immediately and be dismissible only via acknowledgement.
