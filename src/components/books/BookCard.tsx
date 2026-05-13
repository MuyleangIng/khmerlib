"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, CATEGORIES } from "@/lib/types";
import { Eye, Heart, FileText } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function BookCard({ book }: { book: Book }) {
  const { locale, t } = useI18n();
  const category = CATEGORIES.find((c) => c.value === book.category);

  return (
    <Link href={`/books/${book.id}`} className="book-card fade-in group">
      {/* Cover */}
      <div
        className="relative w-full rounded-xl overflow-hidden shadow-md"
        style={{ aspectRatio: "2/3", background: "var(--border)" }}
      >
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-3"
            style={{ background: "linear-gradient(135deg, var(--accent) 0%, #8b2fc9 100%)" }}
          >
            <FileText size={28} color="rgba(255,255,255,0.7)" />
            <p className="text-white text-xs text-center mt-2 font-medium leading-tight line-clamp-3">
              {book.title_kh || book.title}
            </p>
          </div>
        )}

        {/* Content type badge */}
        <div className="absolute top-2 right-2">
          <span
            className="text-xs px-1.5 py-0.5 rounded font-semibold"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            {book.content_type === "pdf" ? t("book.pdf") : t("book.article")}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <p
          className="book-card-title text-sm font-semibold line-clamp-2 leading-tight"
          style={{ color: "var(--foreground)" }}
        >
          {book.title_kh || book.title}
        </p>
        {book.author && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
            {book.author}
          </p>
        )}
        {category && (
          <span className="book-card-category category-badge mt-1 inline-block">
            {locale === "km" ? category.labelKh : category.label}
          </span>
        )}
        <div className="book-card-meta flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--muted)" }}>
            <Eye size={11} /> {book.view_count}
          </span>
          <span className="flex items-center gap-0.5 text-xs" style={{ color: "var(--muted)" }}>
            <Heart size={11} /> {book.like_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
