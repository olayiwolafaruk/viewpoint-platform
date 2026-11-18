# Viewpoint

A Nigerian reader-rewards and publisher-campaign platform. **Current status: prototype and database foundation only. Not production-ready.**

## What's present

- Responsive Next.js homepage, reader profile, and publisher dashboard previews. All balances, stories and management changes shown in the interface are examples, not connected to the database.
- Initial D1/Drizzle schema and generated SQL migration for accounts, campaigns, posts, feeds, claims, deposits, app-install submissions, airtime requests and wallet records.
- Password hashing and server-side Turnstile verification helpers, with basic unit tests. These are not connected to account routes yet.
- OpenNext/Cloudflare configuration. The database binding requires the user's actual Cloudflare D1 database ID.

## What is not yet implemented

Authentication, sessions, Turnstile, server-side authorization, real campaign creation and editing, RSS fetching, payments, webhooks, claim processing, fraud controls, screenshot uploads and review, airtime redemption, and admin controls. The schema alone does not enforce all business/security rules. No money or personal data should be handled with this prototype.

## Local interface preview

Use Node.js 22.12 or newer (Node 22 LTS is recommended).

```sh
npm ci
npm run dev
# Run the current helper tests:
npm run test:security
```

## D1 setup (when ready)

```sh
npx wrangler login
npx wrangler d1 create viewpoint-db
```

Copy the database ID from Wrangler into `wrangler.toml` in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`. This ID identifies the database and is not a secret. Do not put API keys in this file or commit `.dev.vars` or `.env` files.

```sh
npm run db:migrate:local
# Only after reviewing the migration and confirming the Cloudflare account:
npm run db:migrate:remote
```

OpenNext build: `npm run cf:build`. This foundation has not yet been tested against a live D1 database or deployed. Do not deploy as a production financial service without completing and reviewing the unfinished features.

## New GitHub repository

Create an empty private repository on GitHub, then run these commands in the project directory, replacing the URL with your repository URL:

```sh
git init
git add .
git commit -m "Add Viewpoint prototype and database foundation"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

GitHub authentication may be required. Review `git status` before committing and never commit secrets.

## Product decisions

- Reader points: 100 points = ₦1 in airtime credit; financial amounts are integer kobo.
- Article duration: at least 60 seconds; default cooldown is 24 hours per post, adjustable by the owner.
- App-install campaigns: minimum price ₦10 per approved install; default 65/35 split, minimum example ₦6.50 reader and ₦3.50 platform. One submission per viewer and campaign.
- Campaign balances are not refunded upon article removal. Any reallocation mechanism requires careful accounting and has not yet been implemented.

## Security and dependency status

The npm audit has reported high-severity dependency advisories. Assess and remediate them before deployment. Review Cloudflare runtime support, safe URL fetching/SSRF prevention, idempotent atomic D1 writes, payment verification, private evidence storage, and all authorization and privacy requirements before accepting real users or money.
