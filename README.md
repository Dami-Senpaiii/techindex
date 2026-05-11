# TechIndex

Static TechIndex site deployed on Cloudflare Pages.

## Cloudflare Access for `/Adm1n`

The admin area is protected by a Cloudflare Pages Functions middleware in
`functions/Adm1n/_middleware.js`. It rejects requests unless they include a
valid Cloudflare Access JWT for the configured Access application.

Required Cloudflare Pages environment variables:

- `CF_ACCESS_TEAM_DOMAIN`: your Access team domain, for example
  `your-team.cloudflareaccess.com`
- `CF_ACCESS_AUD`: the Application Audience (AUD) tag from the Cloudflare
  Access application. Multiple AUD values can be comma-separated.

Cloudflare Zero Trust setup:

1. Create a self-hosted Access application for the admin URL, for example
   `https://example.com/Adm1n*`.
2. Add an allow policy for the users or identity groups that may access admin
   tools.
3. Copy the application's AUD tag into `CF_ACCESS_AUD`.
4. Set `CF_ACCESS_TEAM_DOMAIN` and deploy the Pages project.

If either environment variable is missing, `/Adm1n` returns `503` instead of
serving the admin placeholder.

## Dynamic articles

Articles are now served through Cloudflare Pages Functions:

- Public list API: `/api/articles`
- Dynamic article pages: `/articles/{slug}`
- Protected admin API: `/Adm1n/api/articles`

The admin API is under `/Adm1n`, so the existing Cloudflare Access middleware protects article writes. For server-side persistence, bind a Cloudflare KV namespace to the Pages project with one of these binding names:

- `TECHINDEX_ARTICLES` recommended
- `ARTICLE_STORE`
- `ARTICLES_KV`

Without a KV binding, the functions return the seeded article set and the admin keeps edits only in the browser as a local fallback.
