# Direct arena sponsorship

The arcade has left-wall and right-wall inventory. Empty boards are explicitly available spaces, not paid advertisers. Clicking a board from the menu, or choosing “Sponsor a wall”, opens the enquiry form. Enquiries require an account, are saved in D1 `sponsor_request`, and receive a reference. Pricing, artwork, dates, payment and approval are manual. No money is collected by the game.

Review enquiries using the Cloudflare D1 dashboard or a read-only CLI query:

```powershell
npx wrangler d1 execute yaba-fight-players --remote --command "SELECT id,slot,brand,contact_email,website,message,created_at FROM sponsor_request ORDER BY created_at DESC LIMIT 50"
```

Do not publish contact details or database exports in Git. Contact an advertiser only after reviewing their request and agreeing the commercial terms yourself.

To publish an agreed placement, put the approved creative in `public/sponsors/` and add an entry to `public/sponsors/placements.json`:

```json
[
  {
    "slot": "left-wall",
    "brand": "Agreed business name",
    "image": "/sponsors/approved-art.webp",
    "url": "https://advertiser.example/",
    "start": "2026-11-01T00:00:00Z",
    "end": "2026-11-08T00:00:00Z"
  }
]
```

This is an example, not an active booking. Use UTC timestamps. Creatives must be local files below `/sponsors/`; links must use HTTPS. Expired or invalid entries are hidden. Use a landscape creative with a simple large wordmark; avoid paragraphs on the small board. Test both phone orientations before deploying. A sponsor label remains visible. The destination opens only after the player deliberately opens the sponsor panel. Fighting controls never open an advertiser link.

Deploy the static app after editing the placement file. Remove an entry to withdraw a creative. There are no ad-network scripts, impression claims, tracking pixels, checkout, subscription charges or automatic renewals. This first release sells context and placement manually; add measured, privacy-respecting reporting only when there is a real advertiser requirement.
