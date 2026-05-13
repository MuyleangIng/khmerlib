export const dynamic = "force-dynamic";
import { query } from "@/lib/db";
import { Book } from "@/lib/types";
import Link from "next/link";
import { Plus, BookOpen, Eye, Pencil, Shield } from "lucide-react";
import AdminDeleteButton from "@/components/admin/AdminDeleteButton";

async function getAdminBooks() {
  const { results } = await query<Book>(
    "SELECT id, title, title_kh, category, view_count, like_count, is_published, content_type, created_at FROM books ORDER BY created_at DESC LIMIT 100"
  );
  return results;
}

async function getStats() {
  const { results: total } = await query<{ total: number }>("SELECT COUNT(*) as total FROM books");
  const { results: published } = await query<{ total: number }>("SELECT COUNT(*) as total FROM books WHERE is_published = 1");
  const { results: views } = await query<{ total: number }>("SELECT SUM(view_count) as total FROM books");
  return {
    total: total[0]?.total ?? 0,
    published: published[0]?.total ?? 0,
    views: views[0]?.total ?? 0,
  };
}

export default async function AdminPage() {
  const [books, stats] = await Promise.all([
    getAdminBooks().catch(() => [] as Book[]),
    getStats().catch(() => ({ total: 0, published: 0, views: 0 })),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Shield size={24} style={{ color: "var(--accent)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Admin Panel
          </h1>
        </div>
        <Link
          href="/admin/books/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={16} /> បន្ថែមសៀវភៅ
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "សៀវភៅសរុប", value: stats.total, icon: BookOpen },
          { label: "បោះពុម្ពហើយ", value: stats.published, icon: Eye },
          { label: "ចំនួនទស្សនា", value: stats.views?.toLocaleString() ?? 0, icon: Eye },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Icon size={20} style={{ color: "var(--accent)" }} />
            <p className="text-2xl font-bold mt-2" style={{ color: "var(--foreground)" }}>{value}</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Books table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)" }}>ចំណងជើង</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)" }}>ប្រភេទ</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)" }}>ទម្រង់</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)" }}>ទស្សនា</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--muted)" }}>ស្ថានភាព</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {books.map((book, i) => (
                <tr
                  key={book.id}
                  style={{
                    background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium line-clamp-1" style={{ color: "var(--foreground)" }}>
                      {book.title_kh || book.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="category-badge">{book.category}</span>
                  </td>
                  <td className="px-4 py-3 uppercase text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {book.content_type}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                    {book.view_count}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        book.is_published
                          ? { background: "#d1fae5", color: "#065f46" }
                          : { background: "#fef9c3", color: "#713f12" }
                      }
                    >
                      {book.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/books/${book.id}/edit`} className="p-1.5 rounded hover:bg-gray-100">
                        <Pencil size={14} style={{ color: "var(--muted)" }} />
                      </Link>
                      <AdminDeleteButton bookId={book.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: "var(--muted)" }}>
                    មិនទាន់មានសៀវភៅ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
