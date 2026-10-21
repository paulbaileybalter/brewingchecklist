# Balter Brewing — Brewery Team Leader Checklist

Static site (`public/`) plus a password gate (`functions/_middleware.js`) for Cloudflare Pages.

## Deploy: GitHub -> Cloudflare Workers
This is a Worker (`src/worker.js`) that serves `public/` and checks the password first. Config is in `wrangler.jsonc`.
1. Push this folder to a **private** GitHub repo.
2. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Import a repository** -> pick the repo.
3. Build command: **(blank)**. Deploy command: `npx wrangler deploy` (the default). Deploy.
4. Open the Worker -> **Settings -> Variables and Secrets** -> add:
   - `SITE_PASSWORD` (type **Secret**) - the shared password
   - `SESSION_SECRET` (type **Secret**, optional) - any long random string
   Click **Deploy** so the secrets take effect.
5. Visit the site: you should get the Balter login page.

If you already created a static-assets-only Worker, delete it or point it at this repo again; the variables option appears once the Worker has code (`src/worker.js`).

## Shared data (Cloudflare KV)
Ticks, comments and notes are stored in a **Workers KV** namespace bound as `CHECKLIST` (declared in `wrangler.jsonc`), one entry per date, kept for about 13 months. Everyone using the site sees the same checklist and updates arrive within about 6 seconds. Each tick shows who made it and when (from the "Your name" box).

Setting up the KV namespace - either way works:
- **Automatic:** `wrangler.jsonc` lists the binding without an ID, and recent Wrangler versions create the namespace for you on the first deploy.
- **Manual:** Cloudflare dashboard -> **Storage & databases -> KV -> Create**, copy the namespace ID, and add `"id": "<that id>"` to the `CHECKLIST` entry in `wrangler.jsonc`, then push.

Good to know:
- Different people changing different items never clash. If two people change the *same* item within the same moment, the last change wins.
- KV is "eventually consistent": people in the same place see each other's changes almost immediately, but a different region can lag up to about a minute.
- If the connection drops, the page shows "Offline", keeps saving on the device and uploads when it's back.
- **Clear** wipes that date for everyone.
- KV free plan: 1,000 writes/day (a normal day uses a few hundred at most) and 100,000 reads/day (the page checks for updates every 6 seconds, only while the tab is open and visible).

## Test locally
    cp .dev.vars.example .dev.vars   # edit the password
    npx wrangler dev

## Using the checklist
- Ticks, comments and notes are shared with everyone (see above). Your name is remembered on your device.
- **General comments / important information** is a shared notes log at the bottom: type a note and press Add (or Ctrl/Cmd + Enter). It appears in the email copy too.
- **Email copy** shows a preview, then **Copy email** puts rich HTML on the clipboard - paste into Outlook/Gmail.
  Lexend appears for recipients who have it installed; otherwise Segoe UI/Arial is used.
- **Print / PDF** gives a clean print layout.

## Editing the checklist items
Edit the `SECTIONS` array near the top of the script in `public/index.html`.
