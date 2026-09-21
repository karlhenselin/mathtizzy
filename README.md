# Mathtizzy

A small math-facts practice app for kids. Problems start easy and get harder as each fact becomes fast and accurate. Progress is saved per player in the browser (or on-device in the Android app).

Open `index.html` in a browser, or serve the folder with any static host.

## Play

1. Type a name (or tap an existing player).
2. Start practicing. Enter answers with the on-screen pad or the keyboard.
3. Level up when every fact on the current grid is green, or stay and keep practicing.

A fact turns **green** (mastered) when its average correct time is at or under the maximum-time setting **and** it has **4 recent correct answers** with **at most one miss** in the last 5 (so 4 in a row with no misses counts), **or** when it has never been missed, has at least **2 correct answers**, and that average is **under 75%** of the maximum-time setting. The mastery bar fills with partial credit as facts improve, not only when they turn fully mastered. The Facts map shows unseen (white), never-missed progress (light greens), and ever-missed accuracy (orange → yellow).

Missed facts are spoken aloud (if sound is on) and highlighted in reading order — once to listen, then again to read along. The first miss each day shows a short tip explaining that. Sound off still walks the highlights at the same pace.

## Levels

1. Tiny Totals 1 — addition up to 4
2. Tiny Totals 2 — addition up to 6
3. Adding Up 1 — addition through 8
4. Adding Up 2 — addition through 10
5. Take Away 1 — subtraction up to 4
6. Take Away 2 — subtraction up to 6
7. Take Away 3 — subtraction up to 8
8. Take Away 4 — subtraction up to 10
9. Plus & Minus — mixed + and − through 12
10. Times Starter 1 — multiplication through 4
11. Times Starter 2 — multiplication through 6
12. Times Tables 1 — multiplication through 8
13. Times Tables 2 — multiplication through 10
14. Fair Shares — division with whole-number answers
15. Fact Mixer — all four operations through 12
16. Bigger Bites — larger numbers, mixed operations
17. Two-Digit Mix — two-digit addition and subtraction
18. Speed Facts — mixed facts with a 7-second clock
19. Mathlete — expert mix with a 5-second clock

On early + / − / × ladder steps, facts that were ever missed lose their recent streak and must be remastered. Later levels reuse shaky facts more often. Green facts almost never appear.

## Settings

**Maximum time** (1.5–8 seconds, default 3.5s) is the fluency bar. A fact only counts as mastered when it is usually answered within this limit. If several answers in a row are correct but slow, the limit eases up a little.

Sound on/off is on the practice screen. Music track and volume are in Settings. Reset progress (from home) clears that player only.

## Android (Capacitor)

Requires Node.js 22+, [Android Studio](https://developer.android.com/studio) Otter or newer, JDK 21, and Android SDK **36**.

```bash
npm install
npm run cap:android
```

That copies the web assets into `www/`, syncs them into the native project, and opens Android Studio. After web changes, run `npm run cap:sync` (or `cap:android` again) before rebuilding.

To make a Play Store upload: **Build → Generate Signed Bundle / APK**, choose **Android App Bundle**. The file is `android/app/build/outputs/bundle/release/app-release.aab`. Full signing steps are in [`playStoreAssets/RELEASE.md`](playStoreAssets/RELEASE.md).

The daily correction tip uses a pre-recorded clip (Microsoft Edge neural TTS, same voice as Shepherd) at `assets/voice/`. Missed facts still use live TTS. Generate or refresh clips with Python `edge-tts` installed (`pip install edge-tts`), then:

```bash
npm run voice
```

Playback falls back to `@capacitor-community/text-to-speech` on Android or `speechSynthesis` in the browser if the clip is missing. Highlight timing can be tuned per platform in `SPEECH_BY_PLATFORM` inside `app.js` (`web`, `android`, `ios`).

The project uses Capacitor 8 (`minSdk` 24, `targetSdk`/`compileSdk` 36).

## Files

- `index.html` — screens and layout
- `styles.css` — look and feel
- `app.js` — problems, scoring, speech, and local storage
- `package.json` — Capacitor dependencies and scripts
- `capacitor.config.json` — app id and `webDir`
- `scripts/copy-www.mjs` — copies static assets into `www/` for Capacitor
- `scripts/generate-voice.mjs` — offline Edge TTS → `assets/voice/*.mp3`
- `assets/voice/` — pre-recorded correction tip clip + `manifest.json`
- `android/` — native Android project (Gradle module is `app`; the Play name stays Mathtizzy)
- `.htaccess` — serves `index.html` as the directory index

Each player’s level, streaks, settings, and per-fact stats live in `localStorage`. Nothing is sent to a server.

## Credits

Music by [Fesliyan Studios](https://www.fesliyanstudios.com/).
