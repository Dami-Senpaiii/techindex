# TechIndex – Static Landing Page

This repository contains a single-page static site for TechIndex. The markup is optimized to be uploaded directly to Cloudflare Pages (or any other static host).

## Deploying to Cloudflare Pages
1. Create a new project in Cloudflare Pages and choose **Direct Upload** or connect this repository.
2. If you connect the repository, you can keep the default `npm install && npm run build` command. The provided `package.json` simply echoes a message so the build step succeeds without producing additional assets.
3. Set the output directory to `.` so the root files are published as-is.
4. Upload or push the repository. Cloudflare will serve `index.html` from the project root.

## Local Preview
Double-click `index.html` or open it via `python -m http.server` to review the page in a browser.
