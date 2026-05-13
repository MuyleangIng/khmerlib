# KhmerLibrary Setup Guide

## 1. Cloudflare D1 Database

```bash
# Install wrangler
npm install -g wrangler
wrangler login

# Create D1 database
wrangler d1 create khmerlibrary-db

# Copy the database_id to wrangler.toml
# Run schema
wrangler d1 execute khmerlibrary-db --file=./schema.sql
```

## 2. Cloudflare R2 Bucket

Go to Cloudflare Dashboard → R2 → Create Bucket: `khmerlibrary-books`

Then:
- Create R2 API token with Read & Write permissions
- Enable "Public access" on the bucket (for direct CDN URLs)
- Copy Public URL (e.g. `https://pub-xxxx.r2.dev`)

## 3. Clerk Authentication

1. Create account at clerk.com
2. Create a new app → Enable **Google** provider only
3. Copy keys to `.env.local`
4. In Clerk Dashboard → Users → find your user ID
5. Paste your user ID in `ADMIN_USER_IDS` env var

## 4. Environment Variables (.env.local)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

ADMIN_USER_IDS=user_xxxxxxxxxxxxx
NEXT_PUBLIC_ADMIN_USER_IDS=user_xxxxxxxxxxxxx

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=khmerlibrary-books
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

CF_ACCOUNT_ID=...
CF_D1_DATABASE_ID=...
CF_API_TOKEN=...
```

## 5. Deploy to Cloudflare Pages

```bash
# Build
npm run build

# Deploy via Cloudflare Pages (connects to your GitHub repo)
# Or use: npx wrangler pages deploy .next
```

## 6. Run Locally

```bash
npm run dev
# Visit http://localhost:3000
```

## Features Summary

| Feature | Description |
|---|---|
| Home | Book grid with category filter + sort |
| Book Detail | Cover, metadata, view/like count, related books |
| PDF Reader | Full PDF viewer with page controls |
| Text Reader | Markdown content with font/theme settings |
| Reading Settings | Font size slider, Default/Sepia/Dark/Green themes |
| Voice Reading | TTS for Khmer markdown books |
| Admin Upload | PDF + cover image upload → R2 storage |
| Admin Content | Write books in Markdown editor |
| Auth | Google login via Clerk, admin gated by user ID |
| Dark Mode | Auto-detect + toggle, persisted in localStorage |
