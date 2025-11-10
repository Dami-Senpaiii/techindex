# TechIndex – Static Landing Page

This repository contains a single-page static site for TechIndex. The markup is optimized to be uploaded directly to Cloudflare Pages (or any other static host) without a build step or external tooling.

## Deploying to Cloudflare Pages
1. Create a new project in Cloudflare Pages and choose **Direct Upload** or connect this repository.
2. If you connect the repository, set the build command to `-` (no build) and the output directory to `.` so the root files are published as-is.
3. Upload or push the repository. Cloudflare will serve `index.html` from the project root.

## Local Preview
Double-click `index.html` or open it via `python -m http.server` to review the page in a browser.
