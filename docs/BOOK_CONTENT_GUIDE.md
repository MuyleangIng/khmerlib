# Book And Media Storage Guide

## Git Rule

Do not commit large book files into Git.

Ignored local folders:

```text
all book/
file/
venv/
.next/
.vercel/
```

Ignored local file types:

```text
*.pdf
*.mp3
*.wav
*.docx
data.json
.env*
```

Reason:

```text
Git should store source code and documentation.
Cloudflare R2 should store large media files.
Cloudflare D1 should store book metadata and public URLs.
```

## Local Source Book Folder

Use `all book/` only as a local working folder.

Recommended local structure:

```text
all book/
  book-title/
    metadata.json
    thumbnail.jpg
    book.pdf
    audio.mp3
    subtitles.srt
```

Example `metadata.json`:

```json
{
  "title": "Example Book",
  "title_kh": "សៀវភៅគំរូ",
  "author": "Unknown",
  "publisher": "KhmerLib",
  "published_year": 2026,
  "language": "km",
  "category": "literature",
  "tags": ["khmer", "story", "student"],
  "description": "A sample Khmer book for KhmerLib."
}
```

## Production Storage

Upload media to R2:

```text
covers/{id}.jpg
pdfs/{id}.pdf
audio/{id}.mp3
content-images/{uuid}.jpg
```

Save the public URLs in D1:

```text
cover_url
pdf_url
audio_url
```

Save subtitles in D1:

```text
srt_content
srt_file_name
```

Save written content in D1:

```text
content
content_type = markdown
```

## Book Creation Checklist

For each book:

- Prepare a clean cover image.
- Prepare a PDF if the book is scanned or already designed.
- Prepare Markdown content if the book should be readable as text.
- Prepare audio only if narration is available.
- Prepare SRT subtitles only if audio should sync with text.
- Upload cover/PDF/audio to R2.
- Save metadata to D1 through the admin form.
- Confirm the book appears on `/books`.
- Confirm the reader works on `/read/{id}`.

## Recommended Categories

Use values already supported by the app:

```text
collection
literature
technology
general
geography-history
philosophy-psychology
religion
language
arts-entertainment
science
social-science
digital-literacy
```

## Import Strategy For Many Books

For a few books, use the admin form.

For many books:

```text
1. Keep source files in `all book/`.
2. Validate every `metadata.json`.
3. Upload files to R2 with a script.
4. Insert book records into D1 with generated public URLs.
5. Keep `all book/` local and ignored by Git.
```

Existing helper scripts:

```text
fetch_all_books.py
download_books_assets.py
```

Before using scripts, create a local Python environment outside Git:

```bash
python3 -m venv venv
./venv/bin/pip install requests
```

The `venv/` folder is ignored and should not be committed.
