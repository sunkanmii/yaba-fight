# Yaba Fight

**[Play the arcade](https://yaba-fight.sunkanmifafowora.workers.dev)**

Seven rivals. One Mainland. A mobile-friendly, first-person Lagos arcade fighter built with Next.js and Canvas 2D. Read an incoming punch, manage stamina, slip to the opposite side, and spend your counter opening. Three-round fights, seven distinct male rivals, four arenas, ten difficulty levels and adaptive local AI.

## Play

- **J / K / B / P / Space:** Jab, Power, Guard, Parry, Breathe.
- **Left / Right arrows** (or A / D): directional slips. Fist on your left? Slip right. Fist on your right? Slip left. A clean slip avoids the hit and gives your next punch +8 damage. No timing gate.
- **Escape:** pause. Touch buttons provide every action on mobile.
- Parry is **50%**, costs 32 stamina against power and 18 against a jab, and leaves an opening when missed. Mirrored moves do no direct health damage. Jab interrupts power; power chips guard; repeated guards get expensive.
- A health lead ends a round after 30 exchanges. Tied fighters enter finite overtime. Win two rounds to take the fight.
- The rooftop boss charges an unblockable voltage attack for 3.6 seconds. Take one optional preparation, then choose a slip away from his loaded fist. His mechanic resets between rounds/runs.

Easy, Normal and Hard select levels 1, 4 and 8. Settings expose all ten levels. A rival selects before your current input and adapts only to previous moves. Difficulty changes pattern reading and available defensive choices. Every level gives unlimited time to choose; an action starts the exchange. Later fighters are locked in both Arcade and Practice until the previous arcade fight is won. Earned unlocks persist locally. AI is weighted, resource-aware game logic, not a cloud AI service.

## Local development

Requires Node.js 22.18 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. `PORT` can select another port. Arcade requires no account/database and makes no API or gameplay WebSocket calls. Nickname, checkpoint and audio settings stay on the device. Browser visibility pauses the game and suspends audio. Nothing schedules remote arcade work.

## Cloudflare and optional accounts

The static frontend and existing account/enquiry API use the existing `yaba-fight` Worker. Online play is disabled by `ONLINE_PLAY_ENABLED=false`, checked before any room, matchmaking or WebSocket Durable Object access. Existing alarm regression fixes remain. No paid plan, recurring task, cron or domain change is introduced.

Optional email/password accounts and sponsorship enquiries use Better Auth and D1. Signup sends no confirmation email. **Password recovery remains deferred.** Arcade checkpoints are local and do not sync to the account. Signing in is only needed for reserving an account name or submitting a sponsor enquiry.

To test account/enquiry APIs locally:

```sh
npx wrangler d1 migrations apply yaba-fight-players --local
npm run cloudflare:build
npx wrangler dev --port 8799
```

Use the existing ignored `.dev.vars` with a stable `BETTER_AUTH_SECRET`. Never commit or print its value. Stop Wrangler before rebuilding on Windows because it can hold `out` open.

## Verification

```sh
npm test
npm run typecheck
npm run cloudflare:check
```

With a local server running, set `TEST_URL` to its origin (the arcade browser/audio default is port 3005):

```sh
npm run test:browser
npm run test:audio
npm run test:clarity
```

`CHROME_PATH` can override Chrome's location. Browser tests capture six layouts, representative player/opponent poses, the charged boss and a full seven-fight campaign. A local-host-only deterministic handle drives transition fixtures; separate checks use real keyboard/pointer input. The production host exposes no test handle. `npm run test:online` deliberately starts no multiplayer traffic.

`npm run test:accounts` targets the local Cloudflare preview on port 8799 by default. It creates/deletes disposable accounts and enquiries; do not point it at production. Browser screenshots and machine-readable reports are saved in ignored `artifacts/arcade/`.

## Deploy

```sh
npm run cloudflare:build
npx wrangler deploy --dry-run
npx wrangler deploy
```

The existing D1 binding and secret remain in place; normal arcade releases need no schema or secret changes. Preserve the online-off flag. A future multiplayer relaunch needs a separate local integration/load review and explicit owner decision.

## Design, assets and sponsorship

- [Research report: game design and code decisions](docs/ARCADE-RESEARCH.md)
- [Art, audio, icon provenance and licences](docs/ARCADE-ASSETS.md)
- [Direct sponsor placement and owner operations](docs/SPONSOR-OPERATIONS.md)

Direct placements are owner-configured in `public/sponsors/placements.json`. Empty boards advertise available inventory. Enquiries return a database reference; pricing, artwork, dates and payment are agreed manually. No checkout, automatic bookings, tracking ad network or claimed audience metrics exist.

Physical iOS/Android, human onboarding/retention and congested mobile networks still need real-player testing. Automated clears verify rules and progression; they do not prove a game is fun. Persistent friends, online play, cloud arcade saves, password-reset emails and automatic sponsor payments remain deferred. The owner will choose any subdomain.
