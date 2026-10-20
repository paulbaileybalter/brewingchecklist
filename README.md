# Balter Brewing — Brewery Team Leader Checklist (BAL-BRW-FORM-041)

Static site (`public/`) plus a password gate (`functions/_middleware.js`) for Cloudflare Pages.

## Deploy: GitHub -> Cloudflare Pages
1. Create a **private** GitHub repo and push this folder to it.
2. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git** -> pick the repo.
3. Build settings: Framework preset **None**, Build command **(blank)**, Build output directory **`public`**.
4. Before/after the first deploy go to **Settings -> Variables and Secrets** (Production) and add:
   - `SITE_PASSWORD` (type **Secret**) - the shared password
   - `SESSION_SECRET` (type **Secret**, optional) - any long random string
5. Redeploy once after adding the variables. Visiting the site now shows the Balter login page.

Change the password any time by editing `SITE_PASSWORD` and redeploying (everyone is signed out).

## Test locally
    cp .dev.vars.example .dev.vars   # edit the password
    npx wrangler pages dev public

## Using the checklist
- Ticks, comments and the team leader name save in the browser, per date, on that device.
- **Email copy** shows a preview, then **Copy email** puts rich HTML on the clipboard - paste into Outlook/Gmail.
  Lexend appears for recipients who have it installed; otherwise Segoe UI/Arial is used.
- **Print / PDF** gives a clean print layout.

## Editing the checklist items
Edit the `SECTIONS` array near the top of the script in `public/index.html`.
