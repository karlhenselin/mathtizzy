# Mathtizzy

A small math-facts practice app for kids. Problems start easy and get harder as each fact becomes fast and accurate. Progress is saved per player in the browser.

Open `index.html` in a browser, or serve the folder with any static host.

## Play

1. Type a name (or tap an existing player).
2. Start practicing. Enter answers with the on-screen pad or the keyboard.
3. Level up when every fact on the current grid is green, or stay and keep practicing.

A fact turns **green** when its average correct time is at or under the maximum-time setting **and** it has at least **5 correct answers per 1 miss**. The Facts map next to the mastery bar shows unseen (white), shaky (red–gold), and fluent (green) cells.

Missed facts are spoken aloud (if sound is on) and highlighted in reading order so the full equation can be seen and heard. Sound off still walks the highlights at the same pace.

## Levels

1. Tiny Totals — addition up to 5
2. Adding Up — addition through 10
3. Take Away — subtraction without negatives
4. Plus & Minus — mixed + and − through 12
5. Times Starter — multiplication through 5
6. Times Tables — multiplication through 10
7. Fair Shares — division with whole-number answers
8. Fact Mixer — all four operations through 12
9. Bigger Bites — larger numbers, mixed operations
10. Two-Digit Mix — two-digit addition and subtraction
11. Speed Facts — mixed facts with a 7-second clock
12. Mathlete — expert mix with a 5-second clock

Later levels reuse shaky facts more often. Green facts almost never appear.

## Settings

**Maximum time** (1.5–8 seconds, default 3.5s) is the fluency bar. A fact only counts as mastered when it is usually answered within this limit. If several answers in a row are correct but slow, the limit eases up a little.

Sound on/off is on the practice screen. Reset progress (from home) clears that player only.

## Files

- `index.html` — screens and layout
- `styles.css` — look and feel
- `app.js` — problems, scoring, speech, and local storage
- `.htaccess` — serves `index.html` as the directory index

Each player’s level, streaks, settings, and per-fact stats live in `localStorage`. Nothing is sent to a server.
