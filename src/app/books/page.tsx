export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import BookGrid from "@/components/books/BookGrid";
import { query } from "@/lib/db";
import { Book } from "@/lib/types";
import { T } from "@/components/i18n/I18nProvider";

async function searchBooks(q?: string) {
  const term = q?.trim();

  if (!term) {
    const { results } = await query<Book>(
      `SELECT id, title, title_kh, author, cover_url, category, view_count, like_count, created_at, content_type, language
       FROM books
       WHERE is_published = 1
       ORDER BY created_at DESC
       LIMIT 48`
    );
    return results;
  }

  const like = `%${term}%`;
  const { results } = await query<Book>(
    `SELECT id, title, title_kh, author, cover_url, category, view_count, like_count, created_at, content_type, language
     FROM books
     WHERE is_published = 1
       AND (title LIKE ? OR title_kh LIKE ? OR author LIKE ? OR description LIKE ?)
     ORDER BY view_count DESC, created_at DESC
     LIMIT 48`,
    [like, like, like, like]
  );
  return results;
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const books = await searchBooks(q).catch(() => [] as Book[]);
  const hasQuery = !!q?.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          aria-label="Back home"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            {hasQuery ? <T k="books.searchResults" /> : <T k="books.eyebrow" />}
          </p>
          <h1 className="truncate text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {hasQuery ? `“${q}”` : <T k="books.title" />}
          </h1>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--muted)" }}>
          {hasQuery ? <Search size={48} className="mx-auto mb-4 opacity-30" /> : <BookOpen size={48} className="mx-auto mb-4 opacity-30" />}
          <p className="text-lg"><T k="books.emptyTitle" /></p>
          <p className="text-sm mt-1"><T k="home.emptyHint" /></p>
        </div>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}
