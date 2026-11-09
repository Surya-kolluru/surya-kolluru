# Game Design Research

**Research date:** 2026-11-09 (UTC)  
**Purpose:** Derive reusable design principles for original browser arcade games; references are not sources for copied assets, names, layouts, code or sounds.

## Reference notes

### International Arcade Museum / Killer List of Videogames — historical arcade popularity
Source: https://www.arcade-museum.com/top100

The museum separates reader-selected popularity, collector interest and historical lists. Its reader-selected popular titles include maze chase, formation shooters, platformers and vector action, illustrating that recognizable rules and short repeatable challenges span several control styles. This is historical/reference context, not a current global ranking.

**Adopt:** a small set of immediately legible actions, memorable game identities, difficulty that grows through pressure rather than hidden rules, and replay loops built around better personal performance.  
**Avoid:** treating a historical list as evidence of universal modern preference, or copying named characters, signature levels, sprites, music or branded cabinet art.  
**Original translation:** use a new lantern-lit maze and enemy patterns, new starship formations, and locally authored vector-like ship/rock drawings.

### Tetris — official game overview
Source: https://www.tetris.com/about

The official description emphasizes moving, rotating and dropping pieces, completing rows, and increasing fall speed. It explains why an understandable repeated action can still create deep planning and pressure.

**Adopt:** precise discrete inputs, preview of upcoming choices, a visible risk/reward trade-off, increasingly urgent pacing, and unmistakable clear/level feedback.  
**Avoid:** the Tetris name, its branded piece/art treatments, logos, recognizable presentation and original sounds.  
**Original translation:** Block Circuit uses its own palette, board framing, block geometry treatment, interface language and synthesized effects; its mechanics are tested independently.

### Atari — official history (Breakout and Asteroids context)
Source: https://atari.com/pages/history

Atari’s company history discusses the cultural success of Pong and Breakout and later the Asteroids arcade icon. The page is useful historical framing for simple input-response loops and arcade score chasing, but does not establish a specific modern UX recipe.

**Adopt:** clear feedback for every impact, meaningful positioning, mastery through timing, and score/wave progression that is readable at a glance.  
**Avoid:** Atari marks, exact screen layouts, vector assets or original recordings.  
**Original translation:** Prism Breaker uses authored brick patterns and paddle/ball effects; Void Drifter uses new ship and asteroid silhouettes with capped physics and explicit friction.

### Lichess — live chess service and “play against computer” entry point
Source: https://lichess.org/

The home experience exposes quick time controls and a direct “Play against computer” choice. Its presentation makes the opponent option an explicit first-class path rather than burying it in a settings screen. Lichess describes itself as a free, libre, no-ads chess server.

**Adopt:** clear side-to-move status, unobscured board, explicit computer-play entry, strong move feedback, visible move history, and controls near the board. Keep local chess distinctly labelled and disclose the opponent is local/on-device.  
**Avoid:** copying Lichess branding, exact UI or assets; do not imply the arcade has online pairing or a global rating system.  
**Original translation:** retain the existing piece artwork and board, add a “Play Computer” mode and four clearly explained local strength profiles.

### Phaser — official framework documentation
Source: https://docs.phaser.io/

Phaser describes a browser-oriented 2D framework with Canvas/WebGL rendering for desktop and mobile, JavaScript/TypeScript authoring and npm distribution. Its documentation also notes where it is not suitable (e.g., full 3D). This supports Phaser as a credible option, not a requirement.

**Adopt:** use a game-scoped update/render lifecycle, responsive canvases, input abstraction, deterministic logic tests and predictable cleanup.  
**Avoid:** adding an engine merely for brand recognition if small canvas games can meet the performance and maintainability goals without a build. Avoid loading all game runtime code on the landing screen.  
**Original translation:** favor the repository’s existing zero-build Canvas architecture for five compact fixed-playfield games; keep shared shell, storage and input modular. Reconsider Phaser only if proven needs exceed the handwritten engine burden.

## Design synthesis

1. **Readable in seconds, deep over repeat rounds:** show one primary objective and controls before play; reveal advanced systems through play.
2. **Immediate input feedback:** each accepted move/action has a visible response; avoid input queues that feel delayed or unpredictable.
3. **Difficulty through patterns and constraints:** introduce one pressure change at a time and communicate it before it matters. Enemies may be strategic but telegraph intent.
4. **Trustworthy motion:** fixed-step or bounded-delta simulation, deterministic collision handling, and speed limits prevent physics surprises.
5. **Visible score causality:** show score, best, wave/level and bonuses at the moment they change; keep local scores labelled as device-local.
6. **A satisfying end-to-replay loop:** game-over explains the result and offers replay and library exit without an obstructive delay.
7. **Make every screen accessible:** keyboard and touch paths, focus visibility, reduced-motion behavior, text labels in addition to color, and sound that is never required for understanding.
8. **Distinct but coherent rooms:** a common cabinet shell and controls; separate typographic/art palettes by game, restrained glow, and optional nonessential display texture.
9. **No friction before fun:** lazy-load a game when selected; avoid login, API keys, trackers and external dependencies required for basic play.
10. **Original expression:** archetype mechanics may inform broad design, while all names, art, level maps, text and audio are newly made for this project.

## Naming check

The requested working title **Afterhours Arcade** has a direct naming conflict: a GitHub project titled “Afterhours Arcade” describes an existing multi-game browser arcade (https://github.com/UBG10001/afterhours-arcade), and search also returns other arcade uses. A second unrelated project search result also uses the name. The title is therefore not sufficiently distinctive for this project.

The design working name is **Lantern Room Arcade**. A web search for the exact phrase on 2026-11-09 returned no prominent matching arcade brand/product; this is only an obvious-conflict check, not legal clearance or a trademark search. Keep the name subject to owner approval and final search before any commercial use.

## References and access notes

- International Arcade Museum, “Top Coin-Operated Videogames of All Time”: https://www.arcade-museum.com/top100 (accessed 2026-11-09).
- The Tetris Company, “About Tetris”: https://www.tetris.com/about (accessed 2026-11-09).
- Atari, “History”: https://atari.com/pages/history (accessed 2026-11-09).
- Lichess home: https://lichess.org/ (accessed 2026-11-09).
- Phaser documentation: https://docs.phaser.io/ (accessed 2026-11-09).
- Naming check: web search for “Afterhours Arcade” and “Lantern Room Arcade” (accessed 2026-11-09).

These are design observations, not endorsements or claims that any cited system is the world’s best.
