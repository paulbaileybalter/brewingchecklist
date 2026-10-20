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

## Test locally
    cp .dev.vars.example .dev.vars   # edit the password
    npx wrangler dev

## Using the checklist
- Ticks, comments and the team leader name save in the browser, per date, on that device.
- **Email copy** shows a preview, then **Copy email** puts rich HTML on the clipboard - paste into Outlook/Gmail.
  Lexend appears for recipients who have it installed; otherwise Segoe UI/Arial is used.
- **Print / PDF** gives a clean print layout.

## Editing the checklist items
Edit the `SECTIONS` array near the top of the script in `public/index.html`.
