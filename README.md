# Yaba Fight

**[Play the beta](https://yaba-fight.sunkanmifafowora.workers.dev)**

A mobile-friendly first-person sparring game built with Next.js and Cloudflare. Six simultaneous bluff-and-counter actions, stamina, guard pressure, punishable parries and three rounds. Find real opponents, invite a friend, or train against Tunde, Lazarus and Sade with distinct art and adaptive strategies.

## Run the complete game locally

Requires Node.js 22.18 or later. Cloudflare's local runtime provides the account database, room coordination and timers.

```sh
npm ci
npx wrangler d1 migrations apply yaba-fight-players --local
```

Create an ignored `.dev.vars` file with `BETTER_AUTH_SECRET=` followed by a strong random secret (at least 32 characters). This local value must remain stable to retain development sessions. Do not commit it.

```sh
npm run cloudflare:build
npm run cloudflare:dev
```

Open http://127.0.0.1:8787. Stop Wrangler before rebuilding static assets on Windows; it holds the `out` directory open. Use `npx wrangler dev --port 8799` for the test port.

`npm run dev` still runs the original Next.js/Socket.IO prototype for guest practice and frontend iteration. It does not provide the new D1 account APIs or authoritative turn deadlines; use the Cloudflare runtime for complete integration testing and deployment.

## Play

J / K / L / P / F / R: Jab, Power, Block, Parry, Feint, Breathe. All choices reveal together. Stamina costs appear on the controls. Consecutive blocks become expensive; a missed parry exposes you next exchange. Breathe restores 38 stamina but leaves an opening. Read the in-game rules for the full counter table.

Each round ends at knockout, or after 12 exchanges with a health lead. Equal health enters escalating sudden death. Play all three rounds; equal round wins is a drawn match. Online choices have a 15-second server deadline. Missing a turn becomes Breathe; three consecutive misses forfeit.

**Find a fight** uses human-only matchmaking. **Challenge a friend** creates or joins a six-character room. You can practise while waiting, then switch automatically when a real rival arrives. Signed-in page reloads can recover a room using its per-tab session token until expiry after three hours. Session chat is relayed without server message storage.

## Accounts and sponsors

Email/password login and reserved usernames use Better Auth, HttpOnly cookies and Cloudflare D1. Signup sends no confirmation email. **Password recovery is deferred** and the UI states this clearly. Save your password. Completed online results are server-generated; practice records remain local. Account deletion removes stored account records and enquiries.

Courtyard boards save sponsorship enquiries and return a reference. No payments, automatic placements, tracking ads or guaranteed reservations are active. See [release notes and owner review commands](docs/RELEASE-ACCOUNTS-COMBAT.md). The owner has not selected a domain/subdomain or payment service; this release preserves the existing workers.dev address.

## Verify

```sh
npm test
npm run typecheck
npm run cloudflare:check
```

With a local Cloudflare preview running, set `TEST_URL` to its origin and optionally `CHROME_PATH` to Chrome:

```sh
npm run test:accounts
npm run test:online
npm run test:browser
npm run test:audio
node scripts/visual-check.mjs
```

Set `TEST_FORFEIT=1` for the online test to exercise three actual missed deadlines (another 45 seconds). The tests create disposable example.com accounts and delete them afterward. Production account/room rate limits still apply; do not run all account suites concurrently against production.

## Deploy

After Wrangler login, apply migrations to the dedicated game database, provision a signing secret, build and deploy:

```sh
npx wrangler d1 migrations apply yaba-fight-players --remote
node scripts/provision-auth.mjs
npm run cloudflare:build
npx wrangler deploy
```

The secret script creates `.dev.vars` if needed and uploads its value without printing it. Run provisioning once, not on each deploy. Changing a signing secret invalidates existing sessions. For a different Cloudflare account, create a separate database and update the binding ID first. This setup does not select a domain or change billing.

[Product notes](docs/PRODUCT.md), [combat research](docs/COMBAT-RESEARCH.md), [art provenance](docs/ART.md), [verification](docs/VERIFICATION.md).

## Beta limits

Bot adaptation uses weighted heuristics, not machine learning. Persistent friend lists, password-reset email and payment checkout remain deferred. Physical iOS/Android, congested Nigerian mobile networks, audience retention and production load have not been measured. Publish the actual operator/support email and review moderation and policies before a wider campaign. No zero-lag or revenue claim is made.
