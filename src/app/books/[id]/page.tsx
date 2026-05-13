export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { query, queryFirst } from "@/lib/db";
import { Book, CATEGORIES } from "@/lib/types";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Eye, Heart, Calendar, User, BookOpen, Globe, Tag, Download } from "lucide-react";
import BookGrid from "@/components/books/BookGrid";
import LikeButton from "@/components/books/LikeButton";
import ReadButton from "@/components/books/ReadButton";
import ShareButton from "@/components/books/ShareButton";
import { T } from "@/components/i18n/I18nProvider";
import CategoryName from "@/components/books/CategoryName";
import { getBookShareMetadata, makePdfFileName } from "@/lib/share";
import { parseTagList } from "@/lib/tags";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getBook(id: string) {
  await query("UPDATE books SET view_count = view_count + 1 WHERE id = ?", [id]);
  return queryFirst<Book>("SELECT * FROM books WHERE id = ? AND is_published = 1", [id]);
}

async function getRelated(category: string, excludeId: string) {
  const { results } = await query<Book>(
    "SELECT id, title, title_kh, author, cover_url, category, view_count, like_count, created_at, content_type, language FROM books WHERE category = ? AND id != ? AND is_published = 1 ORDER BY view_count DESC LIMIT 6",
    [category, excludeId]
  );
  return results;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await queryFirst<Book>("SELECT * FROM books WHERE id = ? AND is_published = 1", [id]).catch(
    () => null
  );

  return book ? getBookShareMetadata(book, `/books/${id}`) : {};
}

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getBook(id).catch(() => null);
  if (!book) notFound();

  const related = await getRelated(book.category, id).catch(() => [] as Book[]);
  const category = CATEGORIES.find((c) => c.value === book.category);
  const tags = parseTagList(book.tags);

  return (
    <div className="book-detail-page max-w-7xl mx-auto px-4 py-8">
      <div className="book-detail-layout flex flex-col lg:flex-row gap-8">
        {/* Left: Cover + actions */}
        <div className="book-detail-cover-column lg:w-64 shrink-0">
          <div
            className="book-detail-cover relative w-full rounded-2xl overflow-hidden shadow-xl"
            style={{ aspectRatio: "2/3", background: "var(--border)" }}
          >
            {book.cover_url ? (
              <Image src={book.cover_url} alt={book.title} fill className="object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, #8b2fc9 100%)" }}
              >
                <BookOpen size={48} color="rgba(255,255,255,0.5)" />
              </div>
            )}
          </div>

          {/* Stats */}
          <div
            className="mt-4 rounded-xl p-4 flex justify-around"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center" style={{ color: "var(--muted)" }}>
                <Eye size={14} />
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {book.view_count.toLocaleString()}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}><T k="book.views" /></p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center" style={{ color: "var(--muted)" }}>
                <Heart size={14} />
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {book.like_count.toLocaleString()}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}><T k="book.likes" /></p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="book-detail-actions mt-4 space-y-2">
            <ReadButton bookId={book.id} contentType={book.content_type} />

            {book.pdf_url && (
              <a
                href={`/api/books/${book.id}/download-pdf`}
                download={makePdfFileName(book)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition hover:opacity-80"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <Download size={15} /> <T k="book.download" />
              </a>
            )}

            <LikeButton bookId={book.id} initialLikes={book.like_count} />

            <ShareButton title={book.title_kh || book.title} text={book.description} />
          </div>
        </div>

        {/* Right: Book info */}
        <div className="book-detail-main flex-1">
          <div className="mb-2">
            {category && <span className="category-badge"><CategoryName value={category.value} /></span>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2 leading-snug" style={{ color: "var(--foreground)" }}>
            {book.title_kh || book.title}
          </h1>
          {book.title_kh && book.title !== book.title_kh && (
            <p className="text-lg mt-1" style={{ color: "var(--muted)" }}>{book.title}</p>
          )}

          {/* Metadata */}
          <div
            className="mt-6 rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <T k="book.about" />
            </h3>
            {book.language && (
              <div className="flex items-center gap-2 text-sm">
                <Globe size={14} style={{ color: "var(--muted)" }} />
                <span style={{ color: "var(--muted)" }}><T k="book.language" /></span>
                <span style={{ color: "var(--foreground)" }}>
                  {book.language === "km" ? <T k="book.khmer" /> : book.language === "en" ? <T k="book.english" /> : book.language}
                </span>
              </div>
            )}
            {book.author && (
              <div className="flex items-center gap-2 text-sm">
                <User size={14} style={{ color: "var(--muted)" }} />
                <span style={{ color: "var(--muted)" }}><T k="book.author" /></span>
                <span style={{ color: "var(--foreground)" }}>{book.author}</span>
              </div>
            )}
            {book.publisher && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen size={14} style={{ color: "var(--muted)" }} />
                <span style={{ color: "var(--muted)" }}><T k="book.publisher" /></span>
                <span style={{ color: "var(--foreground)" }}>{book.publisher}</span>
              </div>
            )}
            {book.published_year && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} style={{ color: "var(--muted)" }} />
                <span style={{ color: "var(--muted)" }}><T k="book.year" /></span>
                <span style={{ color: "var(--foreground)" }}>{book.published_year}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {book.description && (
            <div className="mt-6">
              <h3 className="font-bold text-sm uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                <T k="book.summary" />
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)", lineHeight: "1.9" }}>
                {book.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--muted)" }}>
                <Tag size={14} />
                <span className="text-sm font-semibold"><T k="book.tags" /></span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="category-badge">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related books */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            <T k="book.related" />
          </h2>
          <BookGrid books={related} />
        </div>
      )}
    </div>
  );
}
