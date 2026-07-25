# Handover: nineofive.no – Google Privacy Fix

## Problem
Family recipe pages were appearing in Google search results when searching "Nineofive". The recipe site needed to be hidden from Google while the real film production company website (`nineofive.no`) is being built.

**Critical constraint:** Do NOT delete or modify MX records or CNAME records that power `anders@nineofive.no` (Google Workspace email).

---

## KEY DISCOVERY (2026-07-06): nineofive.no is served by NETLIFY, not one.com

Verified via `curl -I` (`server: Netlify`) and DNS:

- `nineofive.no` A record → `75.2.60.5` (Netlify load balancer)
- `www.nineofive.no` CNAME → `incredible-duckanoo-ff2709.netlify.app`
- MX records → Google Workspace (aspmx.l.google.com etc.) — **untouched, email works**
- Nameservers: ns01/ns02.one.com (DNS is *managed* at one.com, but web traffic goes to Netlify)

**Implications:**
- The Netlify site auto-deploys from GitHub: `github.com/andyp87/familien-pedersens-matoppskrifter` (this repo). Pushing to `main` deploys the live site.
- The one.com webspace (old 2013 WordPress install, `.htaccess`, uploaded robots.txt) is **not serving any web traffic** for nineofive.no. All File Manager work described below was harmless but ineffective. There was never any WordPress mystery — the recipe app at the root URL is simply this repo's `index.html` served by Netlify's SPA catch-all (`/* → /index.html` in `netlify.toml`).
- The recipe app lives at the ROOT of nineofive.no (not under /kokebok/) — every URL serves it.

---

## The Actual Fix (deployed & verified 2026-07-06, commit 60ffc33)

1. **`netlify.toml`**: added `[[headers]]` block serving `X-Robots-Tag: noindex, nofollow` on `/*`. Marked "Midlertidig / FJERN" — remove when the new site launches.
2. **`index.html` + `capture.html`**: `<meta name="robots" content="noindex, nofollow">` committed and deployed (previously only local/one.com).
3. **`robots.txt`**: deployed via the repo, now serves as plain text. Deliberately `Allow: /` — **no Disallow while de-indexing**, because Google must be able to crawl pages to see the noindex signal. A `Disallow` would leave stale results stuck in the index.

All three verified live:
- `curl -I https://nineofive.no/` → `x-robots-tag: noindex, nofollow` ✅
- `https://nineofive.no/robots.txt` → serves the real file ✅
- Live HTML contains the robots meta tag ✅

Also fixed: git remote had an expired GitHub PAT embedded in the URL; replaced with clean URL + `gh` credential helper.

---

## What Still Needs to Happen

### When the new film production company website is ready:
1. The new site replaces this repo's deploy on Netlify (either a new Netlify site pointed at the domain, or replace the content of this deploy).
2. Remove the temporary `[[headers]]` X-Robots-Tag block from `netlify.toml` so the new site can be indexed.
3. Move the recipe app somewhere permanently noindexed — e.g. keep it on its `*.netlify.app` URL, a private subdomain, or behind Netlify password protection. If it stays under nineofive.no, keep the noindex meta tags.
4. The old WordPress install on one.com webspace can be deleted whenever — it serves nothing. (Leave DNS MX/CNAME alone.)

### Optional — speed up de-indexing:
Google Search Console (search.google.com/search-console) → "Fjerninger" (Removals) to request immediate removal of indexed nineofive.no URLs. Requires verifying domain ownership (DNS TXT record — safe, doesn't touch MX).

---

## Access / Infrastructure

- **Live hosting:** Netlify, site `incredible-duckanoo-ff2709`, auto-deploys from GitHub `andyp87/familien-pedersens-matoppskrifter` (main branch)
- **DNS:** managed at one.com (ns01/ns02.one.com) — MX → Google Workspace, must not change
- **one.com File Manager** (legacy, not serving web traffic): https://filemanager.one.com, login anders.martin.pedersen@gmail.com
