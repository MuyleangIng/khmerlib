# Student Lesson: Build KhmerLib Step by Step

## Goal

Students will learn how a full-stack digital library works:

- Frontend pages show books and reader UI.
- Backend routes receive search, upload, like, and admin requests.
- Clerk controls login and admin access.
- Cloudflare D1 stores book records.
- Cloudflare R2 stores media files like PDF, cover images, audio, and editor images.

## Lesson 1: Understand the App

Start by opening the main folders:

```text
src/app
src/components
src/lib
schema.sql
wrangler.toml
```

Important idea:

```text
Frontend = what users see
Backend = API routes that process data
Database = structured records
Storage = large files
Auth = who can access protected pages
```

## Lesson 2: Frontend Pages

Open these files:

```text
src/app/page.tsx
src/app/books/page.tsx
src/app/books/[id]/page.tsx
src/app/read/[id]/page.tsx
```

Student tasks:

- Change the homepage heading.
- Add a new category label.
- Inspect how `BookCard` displays cover, title, and author.
- Open the reader page and compare PDF mode with Markdown mode.

Key component folders:

```text
src/components/books
src/components/reader
src/components/layout
```

## Lesson 3: Search Query

Search starts in the frontend and calls:

```text
GET /api/search?q=keyword
```

Backend file:

```text
src/app/api/search/route.ts
```

Process:

```text
1. User types a keyword.
2. Browser sends the keyword to `/api/search`.
3. API reads `q` from the URL.
4. API creates `%keyword%`.
5. API queries D1 with SQL LIKE.
6. API returns JSON.
7. Frontend renders matching books.
```

Practice task:

```text
Search by title, title_kh, author, and description.
Then add publisher search as an exercise.
```

SQL idea:

```sql
WHERE title LIKE ?
   OR title_kh LIKE ?
   OR author LIKE ?
   OR description LIKE ?
```

## Lesson 4: Database With D1

Database schema file:

```text
schema.sql
```

Main tables:

```text
books               stores book metadata
book_likes          stores one like per user per book
bookmarks           stores saved page per user
reading_progress    stores current page and total pages
```

Book metadata includes:

```text
title
title_kh
author
category
tags
description
cover_url
pdf_url
audio_url
srt_content
content
content_type
```

Practice task:

```text
Add one test row to D1, then verify it appears on the book list.
```

## Lesson 5: Media Storage With R2 / S3

Do not put large book files in Git. Use Cloudflare R2.

R2 stores:

```text
covers/             book cover images
pdfs/               book PDF files
audio/              narration audio
content-images/     images inserted into Markdown content
```

Source files:

```text
src/lib/r2.ts
src/app/api/admin/uploads/sign/route.ts
src/lib/admin-upload-client.ts
```

Upload process:

```text
1. Admin selects a file in BookForm.
2. Frontend asks backend for a signed upload URL.
3. Backend validates file type and folder.
4. Backend creates a temporary R2 upload URL.
5. Frontend uploads file directly to R2.
6. Frontend stores the public URL in D1.
```

This is better than sending all large files through the database.

## Lesson 6: Authentication With Clerk

Clerk handles sign-in and sign-up pages.

Important files:

```text
src/middleware.ts
src/lib/admin.ts
src/app/sign-in/[[...sign-in]]/page.tsx
src/app/sign-up/[[...sign-up]]/page.tsx
```

Auth process:

```text
1. User signs in with Clerk.
2. Clerk creates a session.
3. Middleware checks the current user.
4. Admin routes require an allowed admin user ID.
5. Non-admin users cannot access `/admin` or `/api/admin`.
```

Required environment variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ADMIN_USER_IDS
```

Practice task:

```text
Create one Clerk user, copy the user ID, add it to ADMIN_USER_IDS, then test /admin.
```

## Lesson 7: Admin Creates a Book

Admin page:

```text
src/app/admin/page.tsx
```

Book form:

```text
src/components/admin/BookForm.tsx
```

Backend route:

```text
src/app/api/admin/books/route.ts
```

Process:

```text
1. Admin enters title, author, category, description, and content.
2. Admin chooses cover, PDF, audio, or subtitle files.
3. Files are uploaded to R2.
4. Public file URLs are saved in D1.
5. Book appears on the public site if `is_published` is enabled.
```

## Lesson 8: Deployment

Local development:

```bash
npm install
npm run dev
```

Cloudflare build:

```bash
npm run pages:build
```

Deploy:

```bash
npm run pages:deploy
```

Before deploy:

```text
1. Set Clerk variables.
2. Set Cloudflare D1 variables.
3. Set R2 variables.
4. Run database schema.
5. Upload media to R2.
6. Test search and admin create/edit.
```

## Student Project Exercises

- Add search by publisher.
- Add filter by language.
- Add a "recent books" section.
- Add reading progress display on the book detail page.
- Add a download button that logs download count.
- Add category management in admin.
- Add Khmer and English language toggle improvements.
