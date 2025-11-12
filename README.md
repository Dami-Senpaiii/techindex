# TechIndex – Static Landing Page

This repository contains a single-page static site for TechIndex. The markup is optimized to be uploaded directly to Cloudflare Pages (or any other static host) without a build step or external tooling.

## Deploying to Cloudflare Pages
1. Create a new project in Cloudflare Pages and choose **Direct Upload** or connect this repository.
2. If you connect the repository, set the build command to `-` (no build) and the output directory to `.` so the root files are published as-is.
3. Upload or push the repository. Cloudflare will serve `index.html` from the project root.

## Local Preview
Double-click `index.html` or open it via `python -m http.server` to review the page in a browser.

## Newsletter Storage & Cloudflare Sync
- Newsletter subscriptions are stored client-side in `localStorage` under the key `techindex.newsletter-subscribers` so they persist between visits on the same device.
- To mirror the list in Cloudflare, provide a Worker endpoint that accepts a JSON payload `{ "email": "user@example.com", "subscribedAt": "2025-11-12T00:00:00.000Z" }` and set the endpoint URL via the `data-endpoint` attribute on the `<form id="newsletter-form">` element in `index.html`.
- When an endpoint is configured, the client keeps the local copy and sends a POST request to Cloudflare after each successful sign-up. If the request fails, the visitor sees an error message but their address remains in the local list so you can retry later.
