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
- Protected admin diagnostics: `/Adm1n/api/env-check`

The admin API is under `/Adm1n`, so the existing Cloudflare Access middleware protects article writes. For server-side persistence, bind a Cloudflare KV namespace to the Pages project with one of these binding names:

- `TECHINDEX_ARTICLES` recommended
- `ARTICLE_STORE`
- `ARTICLES_KV`

Articles are stored only in the bound KV namespace. Without a KV binding, the public article list is empty and admin writes fail instead of falling back to browser-local storage.

If persistence does not activate after adding the binding, open `/Adm1n/api/env-check` while authenticated. It reports only whether each expected article binding exists and whether it exposes KV-style `.get` and `.put` methods.

## Newsletter signups

The newsletter form on `/index.html` posts to `/api/newsletter`. Admin users can view stored signups in `/Adm1n` under the Newsletter panel, which calls `/Adm1n/api/newsletter` and is protected by the existing Cloudflare Access middleware.

Newsletter persistence can use a dedicated KV binding named `TECHINDEX_NEWSLETTER`, `NEWSLETTER_STORE`, `NEWSLETTER_KV`, or `SIGNUPS_KV`. It also falls back to the article KV bindings above. Without one of these bindings, the signup endpoint returns an unavailable status instead of pretending the signup was stored. Existing signups previously captured by the external `submit-form.com` endpoint are not automatically imported.

In Cloudflare Pages, add a KV namespace binding for the newsletter with:

- Variable name: `TECHINDEX_NEWSLETTER`
- KV namespace: `TECHINDEX_NEWSLETTER`

Do not add this as a plain environment variable; the Functions code needs the bound KV namespace object.
