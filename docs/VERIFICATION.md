# Beta verification — 17 October 2026

Live deployment: https://yaba-fight.sunkanmifafowora.workers.dev

Passed:

- Five combat unit tests: counter relationships, all symmetric move combinations, full three-round draws, knockouts, and adaptation using only past choices.
- Next.js production/static build and TypeScript checks.
- Cloudflare Worker binding/type checks and deployment dry run.
- Live two-browser test: create room, join with code, hidden choices, correct damage on both screens, session chat, keyboard action after mouse input, complete three-round practice, and Escape dismissal of the rules dialog.
- Live protocol integration test: two-player capacity, no early move disclosure, duplicate action rejection, authoritative damage, chat, same-page reconnect recovery, invalid room codes, and human-only public matchmaking.
- Chrome visual inspection at 390, 768, 1024, and 1440 pixels. No horizontal document overflow. Revised original guard inspected at desktop and phone widths.
- Production dependency audit: no known advisories reported at verification time.

## Arcade and audio update

- Seven combat tests now include jab interrupting power, a losing matchup for every move, and accurate outcome descriptions from either player's perspective.
- The main screen is a full-viewport game scene and title menu. Portrait and landscape reviews include checking control visibility and both document axes for overflow.
- Browser audio tests measure a non-zero output signal after play, no context before interaction, a silent music bus when muted, audible effects with music off, silence with both muted, saved preferences, and gameplay when audio initialization fails.
- Effects and music use separate gain paths. The original beat schedules against the audio clock; no new audio asset downloads or third-party providers are required.
- Research, design decisions, timing, and limitations are recorded in `COMBAT-RESEARCH.md`.

The phone checks use Chrome viewport simulation; a physical-device/real mobile network test and production load test have not been performed. Reconnection checks cover temporary transport interruption while the same page stays open, not full-page reload or browser storage recovery. The deployment is a beta, with the launch limitations described in the product notes.
