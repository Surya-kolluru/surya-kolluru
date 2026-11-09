# Arcade Design System — Lantern Room Arcade

## Product and brand

- **Name:** Lantern Room Arcade (distinctive working title; exact phrase check found no prominent arcade product match, but no trademark/legal clearance is implied).
- **Positioning:** A small, warmly lit after-dark arcade: eight independent games in an intimate cabinet hall.
- **Voice:** concise, inviting, playful, never breathless. Instructions use direct verbs and no jargon where possible.
- **Primary URL:** `https://surya-kolluru.github.io/surya-kolluru/arcade/` (project subpath must remain supported).
- **Local progress:** best scores and preferences stored on this device; no online leaderboard/account claim.

## Visual principles

- Deep charcoal-green room, warm lantern ivory typography, restrained amber lighting and small cool-color accents for interactive focus.
- Use cabinet structure: room header, cabinet title and controls, stable playfield frame, clear score panel, and lower control guide. Provide a direct, obvious library return.
- Keep decorative lighting outside the active playfield. Optional CRT texture must be an explicit setting, remain low contrast and not affect game canvas pixels or readability.
- Keep transitions brief and respect `prefers-reduced-motion`; no forced intro delay or animation blocking input.
- Use locally hosted SVG/Canvas art. No copied sprites, game marks, recognizable layouts or sound recordings.
- Use a common shell while differentiating each game's environment and palette.

## Game identities

| Game | Color/material direction | Primary interaction | Readability priority |
|---|---|---|---|
| Snake | Sage, paper, apple red; tactile garden grid | Turn and collect | Head, fruit and legal direction are distinct |
| Fire Watch | Dusk teal, forest ink, ember orange | Aim and fire water | Fires, projectile path, wind and village line remain clear |
| Chess | Warm wood, cream, muted green | Select/drag legal moves | Legal targets, check and latest move are not color-only |
| Lantern Maze | Midnight blue, lantern gold | Navigate corridors | Walls, collectibles, enemies and safe routes differ by shape |
| Block Circuit | Graphite, cyan, coral, lime | Move/rotate/drop | Current piece, ghost, next and hold are visually distinct |
| Starline Siege | Ink navy, star white, ion cyan | Move and fire | Player, hostile shots and bonuses remain distinguishable |
| Void Drifter | Deep space, pale vector lines | Rotate, thrust, shoot | Heading, velocity and asteroid scale are legible |
| Prism Breaker | Dark plum, prism amber/mint | Aim paddle and return ball | Ball, paddle, brick health and power-ups are high-contrast |

## Shared component and interaction rules

- Header: wordmark, game count, audio/effects control, optional motion/CRT switch, return navigation when in a cabinet.
- Library: eight distinct entry cards with title, one-line goal, controls, local best and a single play action; cards link to stable game identifiers.
- Cabinet: semantic headings and button labels, visible focus, HUD labels, start/pause/resume/restart/exit controls.
- Controls: keyboard instructions plus touch/mouse path as appropriate; avoid requiring pointer hover for information.
- Score: current score, local best, and level/wave when that concept exists. Do not display a fake global rank.
- Sound: effects and music separately toggleable with independently adjustable levels; the UI remains understandable when muted.
- CRT/attract mode: off by default or easily disabled; lightweight CSS/rendering and never an obstacle to library navigation.
- Motion: reduced-motion setting respects system preference, but never disables essential gameplay cues.

## Responsive layout

- Desktop: cabinet screen centered with side HUD/instructions where space permits.
- Tablet: stack secondary panel below screen; do not shrink the game canvas below a usable size.
- Mobile: single-column cabinet, touch-target minimum around 44 CSS px, canvas contain/scale without distortion, no horizontal overflow, and on-screen controls for keyboard-only games.
- Handle orientation and visibility changes; freeze gameplay on hidden tabs and preserve state rather than advancing unseen.

## Branding implementation checklist

- Page title, description, theme color, favicon and open graph metadata.
- Wordmark, landing heading, all library cards and cabinet labels.
- README arcade preview and caption, all eight direct links.
- Loading/error/empty states and footer.
- Deployment root redirect and artifact names.

Only the README arcade subsection should be changed; keep all approved profile sections untouched.
