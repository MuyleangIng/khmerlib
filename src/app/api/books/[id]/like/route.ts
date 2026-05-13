import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { query, queryFirst } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookId } = await params;

  const existing = await queryFirst(
    "SELECT id FROM book_likes WHERE book_id = ? AND user_id = ?",
    [bookId, userId]
  );

  if (existing) {
    await query("DELETE FROM book_likes WHERE book_id = ? AND user_id = ?", [bookId, userId]);
    await query("UPDATE books SET like_count = MAX(0, like_count - 1) WHERE id = ?", [bookId]);
    const book = await queryFirst<{ like_count: number }>("SELECT like_count FROM books WHERE id = ?", [bookId]);
    return NextResponse.json({ liked: false, like_count: book?.like_count ?? 0 });
  } else {
    const likeId = crypto.randomUUID().replace(/-/g, "");
    await query(
      "INSERT INTO book_likes (id, book_id, user_id) VALUES (?, ?, ?)",
      [likeId, bookId, userId]
    );
    await query("UPDATE books SET like_count = like_count + 1 WHERE id = ?", [bookId]);
    const book = await queryFirst<{ like_count: number }>("SELECT like_count FROM books WHERE id = ?", [bookId]);
    return NextResponse.json({ liked: true, like_count: book?.like_count ?? 0 });
  }
}
