# Ловец на цени

[![Netlify Status](https://api.netlify.com/api/v1/badges/e7c8c4fe-5a0c-43d0-9ebc-16f11de71360/deploy-status)](https://app.netlify.com/sites/kbiz-price-hunter/deploys)

A simplified, SEO-friendly price tracker built with Next.js, Postgres, and Prisma.
Public product pages are crawlable for search bots, while the dashboard stays
private behind magic-link auth (to be wired next).

## What is included
- Next.js App Router with static product pages.
- `sitemap.xml` + `robots.txt` for indexing.
- Prisma schema for products, stores, prices, and shopping lists.
- Magic-link login screen placeholder.

## Recent updates
- Dashboard now includes a product creation form plus a recent-products list.
- Public catalog and product pages merge Prisma products with the static catalog.
- Prices API returns series data for charts; stores API supports listing/creation.
- Dashboard chart loads DB product history and shows loading/empty states.
- Added fallback copy for database products and chart empty states.
- Added an eMAG seed endpoint that inserts 10 monitor products with prices.

## Data maintenance
- Backfill product categories (login required): `POST /api/seed/categories`.
- Normalize store cities from store names (login required): `POST /api/seed/cities`.

## Getting started
```bash
npm install
cp .env.example .env
npm run dev
```

## Next steps
- Set up Postgres and run `npx prisma migrate dev`.
- Implement magic-link auth (email provider + token validation).
- Replace demo products with live data ingestion.

## Local setup (step-by-step)
1) Install Postgres 16 (Homebrew):
```
brew install postgresql@16
brew services start postgresql@16
```

2) Create the database:
```
/opt/homebrew/opt/postgresql@16/bin/createdb kbiz_price_hunter
```

3) Create `.env`:
```
cp .env.example .env
```

4) Update `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/kbiz_price_hunter"
```

5) Run Prisma migration:
```
npx prisma migrate dev
```

6) Start the app:
```
npm run dev
```

## Docker setup (recommended)
```bash
docker compose up --build
```

Then run migrations in another terminal:
```bash
docker compose exec app npx prisma migrate dev
```

Open http://localhost:3000/en

## Supabase setup (production)
1) Create a project at https://supabase.com.
2) Go to Settings → Database and copy the connection string (URI).
3) Set `DATABASE_URL` in Netlify with that URI.
4) Run `npx prisma migrate deploy` to apply migrations.

## Netlify deploy
1) Push this repo to GitHub.
2) Create a new site in Netlify from the repo.
3) Add env vars in Netlify: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`.
4) Build command: `npm run build` (already in `netlify.toml`).
5) Deploy. Netlify will use `@netlify/plugin-nextjs` for SSR.

## Deployment checklist
- Update the Netlify badge with your site ID + name.
- Set `NEXT_PUBLIC_SITE_URL` to your production domain.
- Set `DATABASE_URL` to your Supabase connection string.
- Run `npx prisma migrate deploy` against the production DB.
- Ensure Postgres is reachable from the Netlify environment.
- Configure Resend for price-drop emails (`RESEND_API_KEY`, `ALERT_FROM_EMAIL`).
