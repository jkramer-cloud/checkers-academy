# Checkers Academy Deluxe v1.2 — Edge-Jump Clarity Update

A navy-and-gold educational checkers game with computer opponents, local two-player mode, 12 puzzles, 9 lessons, XP, and customizable pieces and boards.

## Publish to GitHub Pages

1. Create a repository called `checkers-academy`.
2. Upload **all files in this folder** to the **root** of the repository. Keep `index.html`, `app.js`, `styles.css`, `deluxe.css`, and `favicon.svg` together. Do not upload the ZIP as a single file.
3. Commit changes to `main`.
4. Go to **Settings > Pages > Deploy from a branch**, choose `main` and `/ (root)`, and Save.
5. The game will normally be available at `https://YOUR-USERNAME.github.io/checkers-academy/`.

The game can also be opened locally by launching `index.html` in a browser. No packages, framework, or external APIs are required.

## Files

- `index.html`: game page and interface
- `app.js`: rules, opponents, puzzles, lessons, XP and saves
- `styles.css`: main styling and responsive layout
- `deluxe.css`: navy-and-gold Deluxe theme
- `favicon.svg`: game browser tab icon

## Classroom notes

Progress and settings save in the browser's local storage, not across student devices. Mandatory captures, multi-jumps, kinging, and American checkers rules are supported. Official draw rules or tournament clocks are not automatically enforced.

**This package contains the game ONLY.** Hub artwork and metadata are in the separate Learning Hub package; you do not need that package to run this game.

## v1.1 Fixes (October 31, 2026)
- Mandatory Captures ON/OFF setting on the match setup panel (default ON; persisted with saved settings).
- With ON, standard American checkers applies: captures compulsory, and a capture sequence must finish with the same checker.
- With OFF, a regular move is legal even when a jump exists; if a jump is started, all further captures with that checker still must finish.
- Both computer and human legal move generation use the chosen setting, including the computer search and win detection.
- Computer multi-jumps are now visually displayed one capture at a time rather than instantly removing all captured pieces.
- Human multi-jump destinations glow prominently after each capture; turn-status and Coach's Corner explain the follow-up click.
- Puzzle Lab remains standard-rules, preserving the intended solutions and progression.
- Changing the mandatory-capture toggle starts a new match, without deleting XP, puzzles, badges, or cosmetic unlocks.


## v1.2: edge and multi-jump refinements (October 31, 2026)
- When the next capture has **only one legal landing square**, the human's checker automatically continues after a brief, visible delay. The computer already animates each jump, so both sides now visibly complete forced chains.
- If the route branches, all legal next landings stay highlighted so the student can choose.
- A prominent on-screen explanation identifies the next landing square and whether it will advance automatically.
- When a regular checker is crowned by reaching the far row, the game explains that the turn ends, consistent with American checkers rules (no immediate king-style backward capture).
- Enlarged edge-square continuation outlines for small touchscreens.
- Preserved the v1.1 Mandatory Captures ON/OFF setting; it still applies to both sides.

The game engine already checked all four board boundaries for legal jumps. Edge captures are allowed when the landing square is on the board; off-board landings are not legal.
