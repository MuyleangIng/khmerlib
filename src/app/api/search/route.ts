import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Book } from "@/lib/types";

type SearchBook = Pick<Book, "id" | "title" | "title_kh" | "author" | "cover_url" | "description" | "category">;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const like = `%${q}%`;
  const { results } = await query<SearchBook>(
    `SELECT id, title, title_kh, author, cover_url, description, category
     FROM books
     WHERE is_published = 1
       AND (title LIKE ? OR title_kh LIKE ? OR author LIKE ? OR description LIKE ?)
     ORDER BY view_count DESC
     LIMIT 8`,
    [like, like, like, like]
  );

  return NextResponse.json(results);
}
