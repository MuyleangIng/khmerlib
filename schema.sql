-- KhmerLibrary D1 Schema

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  title_kh TEXT,
  author TEXT,
  publisher TEXT,
  published_year INTEGER,
  language TEXT DEFAULT 'km',
  category TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  audio_url TEXT,
  audio_start REAL DEFAULT 0,
  audio_end REAL DEFAULT 0,
  audio_offset REAL DEFAULT 0,
  srt_content TEXT,
  srt_file_name TEXT,
  content TEXT,
  content_type TEXT DEFAULT 'pdf',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_likes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(book_id, user_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(book_id, user_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(book_id, user_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
CREATE INDEX IF NOT EXISTS idx_book_likes_book_id ON book_likes(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
