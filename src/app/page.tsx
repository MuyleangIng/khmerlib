export const dynamic = "force-dynamic";
import Link from "next/link";
import { query } from "@/lib/db";
import { Book } from "@/lib/types";
import BookGrid from "@/components/books/BookGrid";
import CategoryFilter from "@/components/books/CategoryFilter";
import { BookOpen, TrendingUp, Clock } from "lucide-react";
import { T } from "@/components/i18n/I18nProvider";

async function getBooks(category?: string, sort = "newest") {
  let sql = `SELECT id, title, title_kh, author, cover_url, category, view_count, like_count, created_at, content_type, language
             FROM books WHERE is_published = 1`;
  const params: string[] = [];

  if (category && category !== "all") {
    sql += ` AND category = ?`;
    params.push(category);
  }
  sql += sort === "popular" ? " ORDER BY view_count DESC" : " ORDER BY created_at DESC";
  sql += " LIMIT 24";

  const { results } = await query<Book>(sql, params);
  return results;
}

async function getStats() {
  const { results } = await query<{ total: number }>("SELECT COUNT(*) as total FROM books WHERE is_published = 1");
  return results[0]?.total ?? 0;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const category = params.category ?? "all";
  const sort = params.sort ?? "newest";

  const [books, totalBooks] = await Promise.all([
    getBooks(category, sort).catch(() => [] as Book[]),
    getStats().catch(() => 0),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero banner */}
      <div
        className="rounded-2xl p-8 mb-10 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--accent) 0%, #8b2fc9 100%)" }}
      >
        <div className="relative z-10">
          <div className="flex justify-center mb-3">
            <BookOpen size={40} color="#fff" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            <T k="app.name" />
          </h1>
          <p className="text-white/80 text-lg mb-1"><T k="app.nameEnglish" /></p>
          <p className="text-white/60 text-sm">
            <T k="app.tagline" values={{ count: totalBooks }} />
          </p>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href={`/?sort=newest${category !== "all" ? `&category=${category}` : ""}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition"
          style={sort === "newest"
            ? { background: "var(--accent)", color: "#fff" }
            : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <Clock size={14} /> <T k="home.newest" />
        </Link>
        <Link
          href={`/?sort=popular${category !== "all" ? `&category=${category}` : ""}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition"
          style={sort === "popular"
            ? { background: "var(--accent)", color: "#fff" }
            : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <TrendingUp size={14} /> <T k="home.popular" />
        </Link>
      </div>

      {/* Category filter */}
      <CategoryFilter active={category} sort={sort} />

      {/* Book grid */}
      {books.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--muted)" }}>
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg"><T k="home.emptyTitle" /></p>
          <p className="text-sm mt-1"><T k="home.emptyHint" /></p>
        </div>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}
