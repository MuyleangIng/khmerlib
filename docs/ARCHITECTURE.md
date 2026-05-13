# KhmerLib Architecture

## High-Level Drawing: Vercel + Cloudflare

```text
┌─────────────────────────────────────────────────────────────────────┐
│                            Student/User                             │
│                     Browser, phone, tablet, PWA                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ HTTPS
                                v
┌─────────────────────────────────────────────────────────────────────┐
│                              Vercel                                 │
│  Next.js app: pages, React components, reader UI, API route runtime  │
│  Routes: /, /books, /books/[id], /read/[id], /admin, /api/*         │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │                               │
                │ auth session                  │ API calls
                v                               v
┌───────────────────────────────┐   ┌─────────────────────────────────┐
│             Clerk             │   │        Next.js API Routes        │
│ sign-in, sign-up, admin auth  │   │ search, admin, upload, likes     │
└───────────────────────────────┘   └───────────────┬─────────────────┘
                                                    │
                         ┌──────────────────────────┴──────────────────────────┐
                         │                                                     │
                         v                                                     v
┌─────────────────────────────────────────────┐     ┌────────────────────────────┐
│              Cloudflare D1                  │     │        Cloudflare R2        │
│ SQLite metadata database                    │     │ S3-compatible file storage  │
│ books, likes, bookmarks, reading progress   │     │ covers, PDFs, audio, images │
└─────────────────────────────────────────────┘     └────────────────────────────┘
```

If you deploy the app to Cloudflare Pages instead of Vercel, the same app connects to the same D1 and R2 services. The main difference is the hosting layer: Cloudflare Pages replaces Vercel.

## Process Drawing

```text
1. User opens KhmerLib
   -> Vercel serves the Next.js pages.

2. User searches a book
   -> Frontend calls /api/search?q=...
   -> API route queries Cloudflare D1.
   -> D1 returns book metadata.
   -> Frontend renders book cards.

3. User opens a book
   -> Book detail comes from D1.
   -> Cover/PDF/audio URLs point to Cloudflare R2.
   -> Browser loads large media directly from R2.

4. Admin signs in
   -> Clerk verifies identity.
   -> Middleware checks ADMIN_USER_IDS.
   -> Admin can access /admin and /api/admin/*.

5. Admin uploads a new book
   -> BookForm requests signed R2 upload URL.
   -> File uploads to R2.
   -> API saves public R2 URLs and book metadata in D1.
   -> Public users can read the book.
```

## Request Flow: Search

```text
User types search
  -> Frontend calls GET /api/search?q=...
  -> API route builds SQL LIKE query
  -> D1 returns matching books
  -> Frontend shows result cards
```

Source file:

```text
src/app/api/search/route.ts
```

Important query:

```sql
SELECT id, title, title_kh, author, cover_url, description, category
FROM books
WHERE is_published = 1
  AND (title LIKE ? OR title_kh LIKE ? OR author LIKE ? OR description LIKE ?)
ORDER BY view_count DESC
LIMIT 8
```

## Request Flow: Admin Login

```text
Admin visits /admin
  -> Clerk middleware checks session
  -> If no user, redirect home
  -> If user is not admin, force sign out
  -> If user is admin, allow dashboard
```

Source files:

```text
src/middleware.ts
src/lib/admin.ts
src/app/sign-in/[[...sign-in]]/page.tsx
src/app/sign-up/[[...sign-up]]/page.tsx
```

Admin IDs should be configured using:

```text
ADMIN_USER_IDS=user_xxx,user_yyy
```

## Request Flow: Add Book

```text
Admin fills BookForm
  -> Frontend uploads files through signed upload API
  -> R2 stores cover/PDF/audio/content images
  -> Frontend sends final book metadata
  -> API inserts metadata into D1 books table
  -> Admin dashboard redirects back to /admin
```

Source files:

```text
src/components/admin/BookForm.tsx
src/app/api/admin/uploads/sign/route.ts
src/app/api/admin/books/route.ts
src/lib/r2.ts
src/lib/db/index.ts
```

## Frontend Architecture

```text
src/app/
  page.tsx                       homepage
  books/page.tsx                 book list
  books/[id]/page.tsx            book detail
  read/[id]/page.tsx             reader
  admin/page.tsx                 admin dashboard
  admin/books/new/page.tsx       create book
  admin/books/[id]/edit/page.tsx edit book
  api/                           backend routes

src/components/
  books/                         cards, filters, buttons
  reader/                        PDF, Markdown, zoom, reading settings
  admin/                         book form, rich editor, delete button
  layout/                        shell, navbar, footer, status, PWA
  ui/                            shared UI primitives
```

## Backend Architecture

```text
src/app/api/
  search/route.ts                    public search endpoint
  books/[id]/like/route.ts           like action
  books/[id]/download-pdf/route.ts   PDF download
  admin/books/route.ts               create book
  admin/books/[id]/route.ts          update/delete book
  admin/uploads/sign/route.ts        presigned R2 upload URL
  admin/upload-image/route.ts        editor image upload
  admin/test-db/route.ts             D1 test endpoint
  force-signout/route.ts             auth cleanup
```

## Storage Architecture

```text
D1 stores metadata:
  books.id
  books.title
  books.description
  books.cover_url
  books.pdf_url
  books.audio_url
  books.srt_content
  books.content

R2 stores binary files:
  covers/{bookId}.jpg
  pdfs/{bookId}.pdf
  audio/{bookId}.mp3
  content-images/{uuid}.jpg
```

## Cloudflare / Wrangler Config

`wrangler.toml` is used when working with Cloudflare Pages/Workers bindings. Do not commit private tokens. Keep database IDs as local deployment configuration when possible.

```toml
[[d1_databases]]
binding = "DB"
database_name = "khmerlibrary-db"
database_id = "replace_with_cloudflare_d1_database_id"

[[r2_buckets]]
binding = "BOOKS_BUCKET"
bucket_name = "story"
```

The current app also uses Cloudflare REST API environment variables in `src/lib/db/index.ts`:

```text
CF_ACCOUNT_ID
CF_D1_DATABASE_ID
CF_API_TOKEN
```

R2 upload uses:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

## Production Checklist

- Create Clerk project and set publishable/secret keys.
- Set `ADMIN_USER_IDS` after creating the admin Clerk user.
- Create Cloudflare D1 database and run `schema.sql`.
- Create Cloudflare R2 bucket and public/custom domain for files.
- Add all environment variables to local `.env.local` and Cloudflare Pages.
- Upload book media to R2, not Git.
- Deploy with `npm run pages:deploy`.
