# Yaba Fight

**[Play the live beta](https://yaba-fight.sunkanmifafowora.workers.dev)**

A small mobile-friendly first-person sparring game built with Next.js. Original comic-style art, a Lagos backyard, five bluff-and-counter moves, and three rounds. Adaptive practice, human-only matchmaking, friend-code rooms, and session chat. No email required.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The local Node/Socket.IO server supports two independent browser sessions. Set `PORT` to use another port.

## Cloudflare

Next.js exports the interface to static files. A Worker serves those files; each fight gets its own SQLite-backed Durable Object and native WebSocket connections. A separate object manages matchmaking. Rooms recover after object hibernation and expire after three hours. Chat bodies are relayed without server storage.

```sh
npm run cloudflare:build
npm run cloudflare:dev
```

Open http://127.0.0.1:8787. Use `npx wrangler dev --port 8799` for another port. This runs the Cloudflare backend locally without an account.

```sh
npm run cloudflare:types
npm run cloudflare:check
npm test
npm run typecheck
npx wrangler deploy --dry-run
```

To deploy after signing in with Wrangler:

```sh
npm run cloudflare:deploy
```

This deploys `yaba-fight`, static assets, and two Durable Object namespaces to the selected account. It does not provision a domain or change account billing. No email provider or separate database signup is needed. Cloudflare plan terms and usage limits apply.

## Play and verify

Use J / K / L / P / F or the touch buttons for jab, power, block, parry, and feint. Moves reveal when both fighters submit. All three rounds are played. A round ends at 0 HP or after ten exchanges, when remaining HP decides the result. Equal round wins means a draw.

Jab interrupts power; parry counters jab; power breaks parry; feint punishes block/parry. Each exchange has a visible lock, reveal, and recovery with named outcomes, HP trails, and separate impact cues. The full-screen title menu and fight HUD replace the former webpage layout. Settings provide independent music/effects levels, a sound test, and impact-shake control. The original synthesized percussion/bass loop starts after interaction and pauses with a hidden tab.

For online play, use two independent browser profiles: set names, create a room in one, join its six-character code in the other. Chat appears when both connect. Public matching never assigns bots. Reconnects retain a seat while the page remains open; a full reload creates a new anonymous identity.

`node tests/multiplayer.mjs` tests a running Cloudflare dev server. Set `TEST_URL` for another port or deployment. It checks room capacity, hidden choices, duplicate prevention, damage, chat, reconnect, invalid codes, and human matchmaking. `scripts/visual-check.mjs` uses Playwright; set `CHROME_PATH` and `TEST_URL` for your environment.

`node tests/audio.mjs` measures actual Web Audio output, separate mutes, gesture-only start, and saved settings. [Combat research](docs/COMBAT-RESEARCH.md) links the reviewed sources and explains the timing, balance, visual, and audio changes.

## Beta limits

Bots use adaptive weighted heuristics, not machine learning. The three personalities share illustrated body art with colour variants. Persistent friend lists are deferred. Names and records are editable browser-local values, not verified accounts.

Add the actual operator identity and support email before wider public release, and review the policy dialogs for the deployment. There are no ads, trackers, or payments. [Product notes](docs/PRODUCT.md) cover monetisation and networking; [art notes](docs/ART.md) record provenance and prompts.

The optional Dockerfile supports the persistent Node fallback. Use `npm start`, not `next start`, to include multiplayer. Node fallback rooms are in memory and need one instance; Cloudflare uses per-room durable storage.

See [verification results](docs/VERIFICATION.md) for the completed local and deployed checks.
