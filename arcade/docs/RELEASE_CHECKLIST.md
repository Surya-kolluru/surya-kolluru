# Release Checklist — Lantern Room Arcade

**Current branch:** `arena/4934e8f3-surya-kolluru`
**Status:** Local implementation and test suite pass; GitHub PR/Pages deployment and live-site verification are pending.

## Implemented and locally verified

- [x] Eight game routes/cards; README arcade links and preview updated only in the arcade section.
- [x] Snake full-board terminal-state guard; Fire Watch swept projectile collision; Fire Watch arrow-key aiming.
- [x] Chess local play, pause/resume, validated Stockfish.js 10.0.2 WebAssembly opponent, player color, four strength presets, cancel/reset/undo handling, local engine assets and GPL source notices.
- [x] Lantern Maze, Block Circuit, Starline Siege, Void Drifter and Prism Breaker have playable Canvas mechanics, score/personal-best persistence, start/pause/resume/restart/over, and controls described in the cabinet.
- [x] Original local SVG card art, lantern-room preview, favicon, separate audio controls, optional attract mode, optional CRT, fullscreen control, reduced-motion styling, touch control pad.
- [x] Static project-subpath-compatible assets and same-origin local Chess rules/engine.
- [x] `npm run test:logic`: 14 tests passed.
- [x] `npm run test:browser`: passed in headless Chromium with six viewport profiles, eight screens, gameplay inputs, lifecycle, local storage/audio, Chess rules/opponent and all four strength presets; screenshot suite generated 90 PNGs. The checked-in browser suite uses Node's `node:test` assertions; the browser-run assertion count is not represented as 58 independent executed assertions.
- [x] axe-core landing scan: no violations; browser error/failed-request/HTTP error collection empty.
- [x] `npm audit --omit=optional`: zero vulnerabilities; `git diff --check` clean.
- [x] Visual screenshots manually inspected; see `VISUAL_QA_REPORT.md` and `lantern-room-qa-screenshots.zip`.

## Required before public release

- [ ] Commit and push this working branch, then open a PR to `main`.
- [ ] Require GitHub Actions verification (logic, browser, screenshots and accessibility checks) to pass; fix and rerun if any job fails.
- [ ] Merge only after checks pass so the main-branch Pages workflow can deploy.
- [ ] Confirm the deployment workflow succeeds and the correct URL is published: `https://surya-kolluru.github.io/surya-kolluru/arcade/`.
- [ ] Run browser smoke checks against that live URL and verify all eight routes, local Stockfish worker/WASM, README links and project-subpath assets.
- [ ] Record the deployed commit and workflow run in the final report.

The release is not called deployed until the final checklist is complete. This report does not claim that the current public Pages site has been updated.
