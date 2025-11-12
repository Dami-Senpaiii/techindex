# TechIndex – Static Landing Page

This repository contains a single-page static site for TechIndex. The markup is optimized to be uploaded directly to Cloudflare Pages (or any other static host) without a build step or external tooling.

## Deploying to Cloudflare Pages
1. Create a new project in Cloudflare Pages and choose **Direct Upload** or connect this repository.
2. If you connect the repository, set the build command to `-` (no build) and the output directory to `.` so the root files are published as-is.
3. Upload or push the repository. Cloudflare will serve `index.html` from the project root.

## Local Preview
Double-click `index.html` or open it via `python -m http.server` to review the page in a browser.

## Newsletter-CSV & Export
- Newsletter subscriptions are stored client-side in `localStorage` under the key `techindex.newsletter-subscribers` so they persist between visits on the same device.
- The **CSV exportieren** button in the newsletter section creates a `newsletter-subscribers-YYYY-MM-DD.csv` download with the columns `email` and `subscribed_at` (ISO 8601 timestamp).
- To consolidate sign-ups in Cloudflare, upload the downloaded CSV to the service you prefer (e.g. Cloudflare Email Routing, Workers KV/R2, or an external CRM). For automation you can swap out the localStorage logic with a Cloudflare Worker endpoint that accepts the POST request and appends to R2 or D1.
