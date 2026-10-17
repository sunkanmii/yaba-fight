# Beta verification — 17 October 2026

Live deployment: https://yaba-fight.sunkanmifafowora.workers.dev

Account/strategy release: `61e9c118-7368-4c9c-9b7e-0bba328191bf`.
Alarm lifecycle hotfix: `f786cc2a-b994-40c7-8ba7-9cdee6b42774`.

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

## Account and strategy release

The checks below supersede the former five-move and anonymous-identity results above.

- Twelve combat unit tests passed: all counter combinations, symmetry, finite rounds, stamina bounds, consecutive guard costs, guard shatter, missed-parry exposure, successful-parry refunds, recovery vulnerability and resource-aware adaptive bots.
- Next.js static production build, frontend TypeScript and Worker binding/type checks passed. Worker deployment dry run passed (about 383 KiB compressed).
- Production account API checks passed: signup without email verification, case-insensitive username reservation, HttpOnly secure session cookies, wrong-password rejection, return login, disabled recovery endpoint, account deletion and validated sponsor requests saved in D1.
- Production multiplayer integration passed with independent authenticated browsers: authoritative usernames, no self-pairing, two-seat capacity, hidden pending moves, duplicate rejection, resource resolution, parry punishment, chat and reconnect. All three rounds completed and the completed match appeared in the account's D1 online record.
- Actual production alarms resolved missing inputs at the 15-second deadline. A separate live test exercised three consecutive missed deadlines and verified an authoritative forfeit.
- Production UI playthrough passed: account creation form, human-first menu, bot practice while remaining in the public queue, automatic switch when the second human joined, page reload recovering the fight and account, chat, keyboard controls, stamina recovery and a complete three-round practice match.
- Browser audio output checks passed: gesture-only start, nonzero original music, independent mutes, effect output, hidden-tab suspension, saved settings and playable audio failure fallback.
- Rendered layouts were inspected at 360×640, 375×667, 390×844/900, 768×900, 1024×900, 1440×900 and 844×390. No document overflow at the established breakpoints; all six controls fit. Each rival's loaded artwork was inspected separately. Account dialogs support scrolling on short screens.

Disposable production test accounts and their database enquiries/results are removed by the tests. No real-user data is deleted. Only the existing workers.dev deployment is used; no domain or DNS choice was made.

The phone checks use Chrome viewport simulation. Physical-device/real congested mobile-network checks, production load tests and retention studies have not been performed. Password recovery and online payments remain deliberately deferred. The game remains a beta; see the current release notes for its actual features and limits.

## Alarm lifecycle regression

Leaving a room during an active turn previously retained its deadline. Once closed, the alarm handler skipped combat resolution and rescheduled that past deadline, which could cause a rapid cloud alarm loop after the players had gone.

The hotfix clears the deadline when leaving, schedules only the bounded room expiry, cancels alarms while disposing of closed/expired rooms, and repairs obsolete deadlines in round-over rooms. Five tests execute the actual Worker handlers locally with a mocked runtime. The three relevant regressions were also run against the previous committed Worker and failed, reproducing the defect. All 17 unit tests pass with the fix, as does the Worker type check.

This verification does not create live rooms or consume Durable Object requests. No further live multiplayer test traffic was generated during quota containment. The code fix cannot restore a quota already consumed; runtime verification after quota availability resumes is separate from these local regression results.
