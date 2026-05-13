# KhmerLib Project Overview

## Book / App Name

**KhmerLib**

## Short Description

KhmerLib is a Khmer digital library for reading, searching, and managing books online. Students can learn how a real full-stack app works by building the frontend reader, backend API routes, authentication with Clerk, database queries with Cloudflare D1, and media storage with Cloudflare R2 / S3-compatible uploads.

## Khmer Description

**KhmerLib** ជាបណ្ណាល័យឌីជីថលភាសាខ្មែរ សម្រាប់រក្សាទុក ស្វែងរក អាន និងគ្រប់គ្រងសៀវភៅ។ គម្រោងនេះសមស្របសម្រាប់សិស្សរៀន Full-stack Development ព្រោះវាមាន Frontend, Backend API, Authentication, Database, File Upload, PDF Reader, Audio, Subtitle និង Cloud Deployment។

## Main Features

- Public homepage for featured books and categories.
- Book listing with Khmer categories.
- Search API for title, Khmer title, author, and description.
- Book detail page with cover, metadata, tags, and read button.
- Reader page for PDF and Markdown content.
- Audio and SRT subtitle support for narrated books.
- Admin dashboard for creating, editing, deleting, and uploading books.
- Clerk authentication for admin login.
- Cloudflare D1 database for book metadata, likes, bookmarks, and reading progress.
- Cloudflare R2 storage for covers, PDFs, audio, and content images.
- PWA support with install prompt and app manifest.

## Recommended Repository Name

```text
khmerlib
```

## Suggested Tagline

```text
Read Khmer books anywhere.
```

## Suggested Long Description

KhmerLib is a modern Khmer e-library built with Next.js, Clerk, Cloudflare D1, and Cloudflare R2. It helps students understand how frontend pages, backend API routes, database records, authentication, and cloud media storage connect in one complete production-style application.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, CSS, PDF reader components.
- **Backend:** Next.js API routes under `src/app/api`.
- **Auth:** Clerk sign-in/sign-up and middleware protection.
- **Database:** Cloudflare D1 using SQL schema in `schema.sql`.
- **Media Storage:** Cloudflare R2 using S3-compatible SDK.
- **Deployment:** Cloudflare Pages / Wrangler.

## Folder Map

```text
storyapp/
  src/app/                  Next.js pages and API routes
  src/components/           UI, layout, admin, reader, and book components
  src/lib/                  database, R2, admin, tags, i18n, and shared helpers
  public/                   static public assets and PWA files
  docs/                     student and architecture documentation
  schema.sql                Cloudflare D1 database schema
  wrangler.toml             Cloudflare Pages, D1, and R2 bindings
  all book/                 local source book files, ignored by Git
  file/                     local temporary files, ignored by Git
```

## Git Setup

Run these commands inside the project folder:

```bash
git init
git add .
git commit -m "Initial KhmerLib project"
```

The `.gitignore` file excludes local secrets, build output, `venv/`, `all book/`, `file/`, PDFs, audio files, and temporary data so the repository stays small and safe.
