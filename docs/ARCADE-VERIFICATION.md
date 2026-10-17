# Arcade release verification — 17 October 2026

The release keeps the existing Worker, database, account secret and host. Online room creation, matchmaking and WebSocket entry are disabled before Durable Object access. No remote multiplayer test, cron, recurring automation, domain change or paid plan is part of this release.

## Automated rules and lifecycle checks

`npm test`: 40 tests covering the new arcade resolver/engine, existing combat regressions and actual Worker handlers with mocked bindings. Cases include matching-move zero-damage outcomes, exact 50% parry threshold, higher power-parry cost, dodge direction/timing, fatigue, guard break, counter consumption, late power, bounded stamina, AI affordability and input independence, pause, seven-fight progression, finite passive play, boss charge/reset and corrupted checkpoints. Offline-switch tests fail immediately if a room request touches a cloud binding.

TypeScript, Cloudflare type checking, the static production build and Wrangler dry run pass. The release does not change the D1 schema or signing secret.

## Browser checks

Playwright/Chrome checks the production export in Cloudflare's local runtime:

- 1440×900 desktop, 768×1024 tablet, 390×844 phone, 360×640 short phone, 320×568 small phone, and 844×390 landscape.
- Actual keyboard input and normal simulation timing, pause/resume, settings/dialog keyboard handling, returning-player layout/checkpoint and selected difficulty on Continue.
- Separate captures of Jab, Power, Guard, Parry, Breathe and both slips for player and opponent. The original segmented rig passed logic checks but failed visual review: stretched forearms and assembled shoulders were unacceptable. It was removed before release. Replacement captures use complete illustrated poses, uniform scaling, low resting hands and distinct defence silhouettes. All seven fighters receive a separate phone guard capture. The rooftop voltage charge and campaign victory also receive screenshot inspection.
- A deterministic rule-aware driver clears all seven fights in the actual browser simulation. This establishes finite progression and state transitions; it is not a human playthrough or evidence of retention.
- Arcade makes zero API calls and zero gameplay WebSocket connections. Optional account/enquiry requests occur only when deliberately opened/submitted.
- Audio is silent before a gesture, has independent music/effect levels, honours master mute and suspends when paused or hidden. All ten selected audio files decode with non-zero signal.
- Disposable local accounts exercise signup, repeat login, username uniqueness, HttpOnly sessions, deletion and sponsor enquiry persistence/validation. A separate phone UI pass submits and removes a real local sponsor enquiry with its test account.

Screenshots and JSON receipts are kept in ignored `artifacts/arcade/`. Asset manifests in the public source record shipping hashes, sizes and licences. The initial bounded Chrome profile at a phone viewport and 4× CPU throttling recorded approximately 16.7ms median and 16.8ms p95 frame intervals across 99 samples. This is a workstation simulation, not a claim about physical phones or every encounter's worst case.

## Remaining real-world evidence

Physical iOS/Android devices, difficult mobile connections, new-player comprehension and repeat play still need human testing. The release offers a stronger set of readable decisions; automated tests cannot establish enjoyment. There is no audience/revenue claim. Online play, cloud arcade checkpoint sync, friend lists, email recovery and automatic sponsor payment remain deferred. The owner chooses any future subdomain.
