# TechIndex – Decap CMS + 11ty on Cloudflare Pages

## Quick start
1) Replace `YOUR_GITHUB_USERNAME` in `admin/config.yml` with your GitHub username.
2) Push this repo to GitHub.
3) Cloudflare Pages → Connect to Git → build with `npm ci && npm run build`, output `_site`.
4) Set env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OAUTH_STATE_SECRET`.
5) Visit `/admin/` to create posts.

Posts are saved under: `src/posts/<Kategorie>/<slug>/index.md` and built to `/<Kategorie>/<slug>/`.