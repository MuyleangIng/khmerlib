import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { queryFirst } from "@/lib/db";
import type { Book } from "@/lib/types";
import { contentDispositionAttachment, makePdfFileName } from "@/lib/share";

export const dynamic = "force-dynamic";

type PdfBook = Pick<Book, "id" | "title" | "title_kh" | "pdf_url">;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await queryFirst<PdfBook>(
    "SELECT id, title, title_kh, pdf_url FROM books WHERE id = ? AND is_published = 1",
    [id]
  ).catch(() => null);

  if (!book?.pdf_url) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const upstream = await fetch(book.pdf_url, { cache: "no-store" }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return NextResponse.json({ error: "PDF download failed" }, { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/pdf",
    "Content-Disposition": contentDispositionAttachment(makePdfFileName(book)),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { status: 200, headers });
}
