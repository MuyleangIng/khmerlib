import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { query, queryFirst } from "@/lib/db";
import { uploadToR2, deleteFromR2, getKeyFromUrl, isManagedR2Url } from "@/lib/r2";
import { Book } from "@/lib/types";
import { readSrtUpload } from "@/lib/srt";
import { stringifyTagList } from "@/lib/tags";

function getSubmittedManagedUrl(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" && isManagedR2Url(value) ? value : "";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const form = await req.formData();

  console.log("📝 PUT /books/", id);
  console.log("   title:", form.get("title"));
  console.log("   content_type:", form.get("content_type"));
  console.log("   content length:", (form.get("content") as string)?.length ?? 0);
  console.log("   is_published:", form.get("is_published"));

  const existing = await queryFirst<Book>("SELECT * FROM books WHERE id = ?", [id]);
  console.log("   existing found:", !!existing);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let coverUrl = existing.cover_url ?? "";
  let pdfUrl = existing.pdf_url ?? "";
  let audioUrl = existing.audio_url ?? "";
  let coverUrlToDelete = "";
  let pdfUrlToDelete = "";
  let audioUrlToDelete = "";
  let srtContent = existing.srt_content ?? "";
  let srtFileName = existing.srt_file_name ?? "";

  const coverFile = form.get("cover_file") as File | null;
  const pdfFile = form.get("pdf_file") as File | null;
  const audioFile = form.get("audio_file") as File | null;
  const srtFile = form.get("srt_file") as File | null;
  const submittedCoverUrl = getSubmittedManagedUrl(form, "cover_url");
  const submittedPdfUrl = getSubmittedManagedUrl(form, "pdf_url");
  const submittedAudioUrl = getSubmittedManagedUrl(form, "audio_url");

  if (submittedCoverUrl && submittedCoverUrl !== coverUrl) {
    coverUrl = submittedCoverUrl;
    if (existing.cover_url && isManagedR2Url(existing.cover_url)) {
      coverUrlToDelete = existing.cover_url;
    }
  }

  if (submittedPdfUrl && submittedPdfUrl !== pdfUrl) {
    pdfUrl = submittedPdfUrl;
    if (existing.pdf_url && isManagedR2Url(existing.pdf_url)) {
      pdfUrlToDelete = existing.pdf_url;
    }
  }

  if (submittedAudioUrl && submittedAudioUrl !== audioUrl) {
    audioUrl = submittedAudioUrl;
    if (existing.audio_url && isManagedR2Url(existing.audio_url)) {
      audioUrlToDelete = existing.audio_url;
    }
  }

  if (coverFile && coverFile.size > 0) {
    const buf = Buffer.from(await coverFile.arrayBuffer());
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const nextCoverUrl = await uploadToR2(`covers/${id}.${ext}`, buf, coverFile.type || "image/jpeg");
    if (existing.cover_url && existing.cover_url !== nextCoverUrl && isManagedR2Url(existing.cover_url)) {
      coverUrlToDelete = existing.cover_url;
    }
    coverUrl = nextCoverUrl;
  }

  if (pdfFile && pdfFile.size > 0) {
    const buf = Buffer.from(await pdfFile.arrayBuffer());
    const nextPdfUrl = await uploadToR2(`pdfs/${id}.pdf`, buf, "application/pdf");
    if (existing.pdf_url && existing.pdf_url !== nextPdfUrl && isManagedR2Url(existing.pdf_url)) {
      pdfUrlToDelete = existing.pdf_url;
    }
    pdfUrl = nextPdfUrl;
  }

  if (audioFile && audioFile.size > 0) {
    const buf = Buffer.from(await audioFile.arrayBuffer());
    const ext = audioFile.name.split(".").pop() ?? "mp3";
    const nextAudioUrl = await uploadToR2(`audio/${id}.${ext}`, buf, audioFile.type || "audio/mpeg");
    if (existing.audio_url && existing.audio_url !== nextAudioUrl && isManagedR2Url(existing.audio_url)) {
      audioUrlToDelete = existing.audio_url;
    }
    audioUrl = nextAudioUrl;
  }

  if (srtFile && srtFile.size > 0) {
    try {
      const srt = await readSrtUpload(srtFile);
      srtContent = srt.content;
      srtFileName = srt.fileName;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid SRT file" },
        { status: 400 }
      );
    }
  }

  const tagsRaw = (form.get("tags") as string) || "";
  const tags = stringifyTagList(tagsRaw);

  const result = await query(
    `UPDATE books SET title=?, title_kh=?, author=?, publisher=?, published_year=?, language=?, category=?, tags=?,
     description=?, cover_url=?, pdf_url=?, audio_url=?, audio_start=?, audio_end=?, audio_offset=?, srt_content=?, srt_file_name=?, content=?, content_type=?, is_published=?, updated_at=datetime('now')
     WHERE id=?`,
    [
      form.get("title") as string,
      (form.get("title_kh") as string) || (form.get("title") as string),
      (form.get("author") as string) || "",
      (form.get("publisher") as string) || "",
      Number(form.get("published_year") || 0) || null,
      (form.get("language") as string) || "km",
      (form.get("category") as string) || "general",
      tags,
      (form.get("description") as string) || "",
      coverUrl,
      pdfUrl,
      audioUrl,
      Number(form.get("audio_start") || 0) || 0,
      Number(form.get("audio_end") || 0) || 0,
      Number(form.get("audio_offset") || 0) || 0,
      srtContent,
      srtFileName,
      (form.get("content") as string) || "",
      (form.get("content_type") as string) || "pdf",
      form.get("is_published") === "on" ? 1 : 0,
      id,
    ]
  );

  if (!result.success) {
    console.error("D1 update failed:", result.error);
    return NextResponse.json({ error: result.error ?? "Database update failed" }, { status: 500 });
  }

  if (coverUrlToDelete && coverUrlToDelete !== coverUrl) {
    await deleteFromR2(getKeyFromUrl(coverUrlToDelete)).catch(() => {});
  }
  if (pdfUrlToDelete && pdfUrlToDelete !== pdfUrl) {
    await deleteFromR2(getKeyFromUrl(pdfUrlToDelete)).catch(() => {});
  }
  if (audioUrlToDelete && audioUrlToDelete !== audioUrl) {
    await deleteFromR2(getKeyFromUrl(audioUrlToDelete)).catch(() => {});
  }

  return NextResponse.json({ id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const book = await queryFirst<Book>("SELECT * FROM books WHERE id = ?", [id]);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (book.cover_url && isManagedR2Url(book.cover_url)) {
    await deleteFromR2(getKeyFromUrl(book.cover_url)).catch(() => {});
  }
  if (book.pdf_url && isManagedR2Url(book.pdf_url)) {
    await deleteFromR2(getKeyFromUrl(book.pdf_url)).catch(() => {});
  }
  if (book.audio_url && isManagedR2Url(book.audio_url)) {
    await deleteFromR2(getKeyFromUrl(book.audio_url)).catch(() => {});
  }

  await query("DELETE FROM books WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
