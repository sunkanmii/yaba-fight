# Accounts and strategic combat — 17 October 2026

The approved direction stays: a full-screen Lagos courtyard, low inward first-person guard, and restrained arcade controls. The primary action is now **Find a fight**. Practice is available without an account. Online rooms never use bots as substitutes for humans.

## The new decisions

Both fighters start each round with 100 HP and 100 stamina. Both stamina meters are public; the pending choices are secret. Costs appear on the buttons. All rules run in the shared resolver and on the authoritative multiplayer server.

| Action | Stamina | Decision |
| --- | ---: | --- |
| Jab | 12 | 14 damage; interrupts power. Block stops it, parry counters it. |
| Power | 26 | 24 damage; 28 against parry, 8 against a healthy guard. Jab interrupts it. |
| Block | 18, then +8 per consecutive block, capped at +24 | Incoming jab drains another 10; power drains another 22. Zero stamina shatters guard: full attack damage +8 and exposure next exchange. |
| Parry | 22 | Counter a jab for 18 and refund 16 stamina. Every other read misses and exposes you next exchange. |
| Feint | 10 | 20 damage against block/parry. Attacks catch it; recovery ignores it. |
| Breathe | Restore up to 38 | No defence; damaging hits gain 6. |

Exposure adds 8 to a damaging hit during the next exchange. Recovery vulnerability and exposure do not stack; exposure takes precedence. A depleted player cannot select an unaffordable action. A stale/old client submitting one becomes Breathe on the server.

Three rounds are played. A knockout ends a round. At exchange 12 a health lead wins; tied health goes into sudden death, draining both players by 5, 10, 15 and so on. Perfectly mirrored play can still draw; it cannot stall forever at full health.

Online turns last 15 seconds. A missing input becomes Breathe. Three consecutive missing inputs forfeit the match; if both are absent, the room closes. The clock uses the server deadline, and Durable Object alarms resolve it even when objects hibernate. Practice has no choice timer.

Tunde, Lazarus and Sade now have separate generated character art. Their weighted strategies and counters differ. They observe only the previous six player choices and public resource state, never the current hidden input. They recover when stamina is low. This is adaptive game logic, not a remote language-model call.

## Accounts and data

Better Auth handles passwords, signed HttpOnly session cookies, login and account deletion. Cloudflare D1 stores its user/session/account tables, completed server-resolved online results and sponsor enquiries. Username normalisation reserves names without regard to case. Login uses email and password. No email confirmation is sent.

**Password reset is explicitly deferred by the owner.** The UI says recovery is unavailable; reset endpoints are disabled. Do not enable a recovery claim until a sender is configured and delivery tested. The signing secret is a Cloudflare secret; `.dev.vars` is ignored by Git.

Room tokens are held in per-tab session storage. Reloading an authenticated tab can recover its room before the three-hour expiry. Reconnecting validates both the account and the room token. Other tabs cannot claim that seat without its token. Signed-out/expired sessions must sign back in first. A full browser-data clear removes the room token but not the account.

Practice while waiting keeps the real multiplayer connection open. When a human joins, the UI cancels the practice timer, switches to the authoritative match and alerts the player. The public queue prunes disconnected owners when matching; room expiry bounds its lifetime.

## Sponsor spaces

Two environmental wall boards offer contextual sponsorship enquiries. Signed-in users can submit a brand, email, https website, selected wall and campaign note. The database saves each request and the UI returns a reference. No charge, guaranteed reservation, automatic artwork publication, payment integration, tracking or impression claim is implied.

The owner can review requests using the Cloudflare dashboard or:

```sh
npx wrangler d1 execute yaba-fight-players --remote --command "SELECT id, slot, brand, contact_email, website, message, status, created_at FROM sponsor_request ORDER BY created_at DESC LIMIT 50"
```

Treat this output as private customer contact information. Agree pricing, dates, artwork and payment before publishing any placement. Domain/subdomain and payment-provider choices remain with the owner.

## Source references

- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password): maintained credential handling and no required email-verification flow.
- [Better Auth username plugin](https://better-auth.com/docs/plugins/username): validation, normalisation and unique names.
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle): SQLite/D1 schema integration.
- [Cloudflare Durable Object alarms](https://developers.cloudflare.com/durable-objects/api/alarms/): server turn deadlines independent of the client clock.

No domain or DNS configuration was selected or changed for this release.
