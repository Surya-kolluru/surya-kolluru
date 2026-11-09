# Visual QA Report

**Run date:** 2026-11-09 (UTC)
**App under test:** local static server, repository project path root `/`
**Browser:** headless Chromium 153 from the npm registry's temporary `@sparticuz/chromium` binary; Playwright 1.65.0. No browser package was added to runtime/project dependencies.
**Screenshot set:** 90 PNGs plus `axe-home.json` in the test output `artifacts/`; the downloadable archive is provided separately as `lantern-room-qa-screenshots.zip`.

## Viewport coverage

| Profile | Viewport | Home, all game panels and overflow assertion | Result |
|---|---:|---|---|
| Desktop large | 1920 × 1080 | Yes | Pass |
| Desktop | 1440 × 900 | Yes | Pass |
| Laptop | 1366 × 768 | Yes | Pass |
| Tablet portrait | 768 × 1024 | Yes | Pass |
| Mobile large | 390 × 844 | Yes | Pass |
| Mobile compact | 360 × 800 | Yes | Pass |

The automated test checks `document.documentElement.scrollWidth <= window.innerWidth + 2` on the landing page and each of the eight game screens at all six sizes. It verifies the game-card artwork is loaded and captures screenshots of all screen starts. Active gameplay is captured at desktop and mobile sizes; gameplay pause and end states are captured for every title. Chess also has board shots at each computer-strength setting and a checkmate state. The suite additionally records an attract-mode shot.

## Manual screenshot inspection

The rendered screenshots were opened and inspected, including:

- 1920 × 1080 landing page, Snake play/pause/game-over, Fire Watch play, and active play for the five new games.
- 1440 × 900 library and Chess computer mode at Beginner/Casual/Skilled/Expert, plus Chess pause and checkmate.
- 1366 × 768 library and 768 × 1024 Chess board/library to check compressed desktop/tablet toolbars.
- 390 × 844 active shooter, game screens and Chess board.
- 360 × 800 full library and card stacking.

### Findings and corrections

1. **Lantern Maze caption crossed the top maze rows.** The original long Canvas caption extended into the first corridor. It was shortened to “GATHER LIGHT”; the cabinet footer remains the full instruction source. The rerun screenshot confirms clear separation between HUD and maze.
2. **Legacy room-edition text still named “The Side Room.”** The game room label was changed to “Lantern Room · Vol. 01.”
3. **Compact toolbars.** At tablet widths some chess button labels wrap to two lines; the controls remain visible, focusable and non-overlapping. Mobile uses a separate single-column layout and large touch controls.
4. **Canvas legibility.** Each canvas preserves its own aspect ratio, does not clip in the tested viewports, and is paired with DOM HUD/instructions so key information is not color- or sound-only.
5. **Mobile library.** At 360 × 800 the eight cards stack into one column, retain readable titles/actions, and the document does not scroll horizontally.

## Accessibility and interaction scan

- axe-core 4.14.0 ran on the 1440 × 900 landing page: **0 reported violations** (`artifacts/axe-home.json` contains an empty violation list).
- The browser suite asserts no critical axe violations on the landing view.
- Keyboard focus styling is global; controls are semantic buttons/selects and have accessible names, including the sound/music icons on compact screens.
- Mobile arrow/action controls are touch-sized and game-specific buttons are hidden when they do not apply (for example, Hold is only shown for Block Circuit).
- Reduced-motion CSS is respected; attract mode stops cycling when the preference requests reduced motion. CRT texture is optional and disabled by default.
- Fullscreen entry/exit was exercised in Chromium through a user click.

## Browser/network observation

Playwright collected page exceptions, console errors, failed requests, and HTTP responses with status 400 or above across the browser suite. **None were observed on the passing run.** The local static test includes the chess rules module and Stockfish worker/WASM from the repository; no required runtime CDN request remains.

## Release assessment

No release-blocking clipping, horizontal overflow, misalignment, broken card art, overlapping controls, or gameplay-overlay readability defects remained in the inspected screenshots. The screenshot archive is an evidence pack, not a substitute for the live-site post-deployment check. GitHub Pages publication and a second browser run against the deployed URL remain pending until the PR/Pages workflow completes.
