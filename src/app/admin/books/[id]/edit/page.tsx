export const dynamic = "force-dynamic";
import { queryFirst } from "@/lib/db";
import { Book } from "@/lib/types";
import { notFound } from "next/navigation";
import BookForm from "@/components/admin/BookForm";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await queryFirst<Book>("SELECT * FROM books WHERE id = ?", [id]).catch(() => null);
  if (!book) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
        កែប្រែសៀវភៅ
      </h1>
      <BookForm book={book as unknown as Record<string, unknown>} />
    </div>
  );
}
