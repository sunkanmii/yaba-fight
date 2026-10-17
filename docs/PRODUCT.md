# Product decisions

## Combat and networks

Simultaneous choices provide bluffing without deciding hits by network latency. Jab, power, block, parry, and feint use the pure shared resolver in `lib/combat.mjs`; animations never decide damage. Both fighters submit before results are revealed. The server ignores invalid, duplicate, and stale actions.

On Cloudflare, each fight has its own SQLite-backed Durable Object and hibernating WebSockets. State is saved before broadcasting and restored after hibernation. A separate object manages the public waiting queue. No bots fill online rooms. No automatic timeout moves are submitted. The same open page can reconnect to its seat until room expiry after three hours; full reload recovery is a future feature. Recovery is best effort, not a zero-lag promise.

The optional Node fallback uses Socket.IO, in-memory rooms, and two-minute disconnect recovery. Both transports share combat logic. Research references: [Socket.IO disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections/), [Colyseus reconnects](https://docs.colyseus.io/room/reconnection), [Cloudflare WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), and [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports).

Practice adapts weighted bot strategies to the previous six choices; bots never receive the current hidden move. Tunde is balanced, Lazarus favours counters, and Sade pressures with power. Body art is currently shared with colour variations.

## Visual direction

The game is the main screen. No marketing sidebar, feature cards, or decorative statistics. The reference guides the low inward guard: fists near 36% and 64% width, knuckles in the lower quarter, forearms leaving the bottom. Original brown-skin ink art, green wraps, courtyard, colours, and impacts distinguish Yaba Fight. Guard halves preserve a common transparent canvas for consistent spacing and independent animation.

## Monetisation

Start with directly sold contextual sponsorship: a local brand on the courtyard wall or one between-match sponsor. Keep active fights unobstructed. Direct placements can work without targeting or third-party trackers. No advertiser or ad SDK is currently connected.

Later: cosmetic wraps or character packs. Do not sell stronger moves or competitive advantages. Payments and recoverable ownership need a secure identity design first. Validate actual audience and retention before quoting sponsor impressions or revenue.

## Before a wider launch

Only name, sound preference, and record are stored locally. Cloudflare stores room state and anonymous tokens until expiry. Chat bodies stay only in the participating pages. Host connection logs may persist separately. Sampled observability is enabled; application code does not deliberately log chat or session tokens.

Supply the real operator and support email, review the draft policies, load-test the deployment, and add reporting/moderation before broad public matchmaking. [Nigeria's implementation guidance](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf) is a review reference; the beta policy is not a compliance certification. Persistent friends are deferred as requested.
