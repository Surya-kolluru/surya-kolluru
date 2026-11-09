# Technical Implementation Plan

**Decision date:** 2026-11-09  
**Goal:** Evolve the existing static, vanilla-ES-module arcade while keeping GitHub Pages project-subpath deployment and preserving current gameplay modules.

## Audit-informed decisions

1. Preserve existing Snake, Fire Watch, audio, and Chess rules code; improve behaviors in place instead of replacing functioning game logic wholesale.
2. Retain `chess.js` for rules, but make its pinned distribution local to the repository (with the package's required notice) so the board does not depend on `esm.sh` at runtime.
3. Implement the five compact games as lazy-imported native Canvas modules, with shared lifecycle/input/storage utilities. The existing project has no build system; a new mandatory framework/build pipeline would add complexity without a demonstrated need for these fixed-screen games.
4. Do not combine Phaser and Pixi. Phaser is a capable, browser-focused 2D framework (official documentation: https://docs.phaser.io/), but this implementation will use Canvas 2D for a smaller offline-capable static artifact and existing architecture. This choice must be re-evaluated if the hand-maintained lifecycle proves error-prone.
5. Implement an original legal-move chess opponent in a dedicated Web Worker only if its difficulty and latency can be verified; preferred is a local Stockfish WebAssembly build if its exact package/version, worker support, size and GPL corresponding-source obligations can all be satisfied. Do not ship an unlicensed or partially sourced engine. If no compliant engine artifact can be included, the computer mode must remain unshipped rather than fake moves; report the limitation.
6. Keep tests and CI reproducible; pin test and runtime dependencies and include browser install instructions in Actions. No secret, server, account, analytics or paid API is introduced.

## Proposed implementation areas

- `arcade/js/app.js`: route/library/cabinet orchestration; lazy imports; visibility pause/resume; single lifecycle and focus management.
- `arcade/js/storage.js`: namespaced preferences and best-score reads/writes with safe fallback.
- `arcade/js/audio.js`: original generated tones/noise, separate music/effects controls, mute lifecycle cleanup.
- `arcade/js/games/*`: per-game model/update/render, UI binding, reset/pause/resume/dispose functions; avoid background game loops.
- `arcade/js/workers/*`: engine communication if compliant engine selected; sequence IDs, cancellation and timeout/error handling.
- `arcade/assets/*`: authored vector art and local licensed dependencies.
- `arcade/tests`: deterministic model tests, browser interaction tests, axe checks and screenshots.
- `arcade/docs`: audit/research/design/technical/visual QA/release reports.

## Lifecycle contract

Each game exposes `create(host, services) -> { start, pause, resume, restart, dispose }`, with a bounded/fixed-step `update`, render at active display cadence only, and no global mutable singleton state. The shell owns one active title and removes all listeners/timers/RAF registrations on switch. On hidden tabs, pause gameplay and reset the delta baseline; exiting disposes all temporary entities and stops game audio. Score writes occur on score updates/game end, not every frame.

## Chess design

- Continue using `chess.js` for legality, SAN/PGN, promotions and terminal state.
- Modes: local two-player or “Play Computer”; select player color and Beginner/Casual/Skilled/Expert before a new match.
- Block human input while the worker is searching; never apply an unvalidated UCI reply.
- Use worker messages with request IDs, FEN, difficulty limits; support stop/reset/exit, worker error, and no legal move.
- Make Beginner forgiving and Expert strongest via measured search/depth/node limits and calibrated fallible play for lower profiles, without asserting Elo values absent controlled testing.
- Lazy-load engine when computer mode is first selected. Keep chess rules engine separate from opponent.
- Before distributing Stockfish: verify chosen upstream artifact's license, source matching that binary, offer required corresponding source, include full license and source/build instructions, and pin the exact upstream revision. Its GPL terms must not be treated as equivalent to the existing chess.js notice.

## Test strategy

- Logic tests: seeded random generators, movement, collision, score/levels, state transitions, persistence and edge-case physics.
- Chess tests: standard legality cases, promotions, claims, mate/stalemate, worker protocol legality/cancellation/timeout and profiles.
- Playwright: all eight routes; real input; pause/resume/restart/exit/re-entry; storage/audio; mobile controls; six required viewports; console/network errors; axe-core scan; full-page and cabinet-state screenshots.
- Build/deployment checks: module syntax, local references, pinned dependencies, license files, Pages subpath and hash routes. The workflow must deploy only after all required checks pass.

## Delivery sequence

1. Finish this plan and audit/research deliverables before source edits.
2. Implement and verify shell, routes, lifecycle, storage and audio.
3. Upgrade old games and chess UI/worker separately.
4. Add games in small batches; test each before integration.
5. Run full browser suite and visual inspection; fix and repeat.
6. Review licenses, README arcade-only diff, project-path deployment and workflow.
7. Do not deploy if required QA cannot run or has release-blocking failures.

## Known environment constraint

In the current agent environment, Playwright's npm package is installable but Chromium download is not available because the browser binary host (`cdn.playwright.dev`) is outside the network allowlist, and there is no system browser installed. This means local visual/browser QA cannot currently be claimed. The CI workflow can provision Chromium on GitHub Actions, but a green CI run and post-deploy browser validation are still required before calling the release complete.
