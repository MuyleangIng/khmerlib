import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import { isManagedR2Url, uploadToR2 } from "@/lib/r2";
import { readSrtUpload } from "@/lib/srt";
import { stringifyTagList } from "@/lib/tags";

function getSubmittedManagedUrl(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" && isManagedR2Url(value) ? value : "";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();

  const coverFile = form.get("cover_file") as File | null;
  const pdfFile = form.get("pdf_file") as File | null;
  const audioFile = form.get("audio_file") as File | null;
  const srtFile = form.get("srt_file") as File | null;

  let coverUrl = getSubmittedManagedUrl(form, "cover_url");
  let pdfUrl = getSubmittedManagedUrl(form, "pdf_url");
  let audioUrl = getSubmittedManagedUrl(form, "audio_url");
  let srtContent = "";
  let srtFileName = "";

  const id = crypto.randomUUID().replace(/-/g, "");

  if (coverFile && coverFile.size > 0) {
    const buf = Buffer.from(await coverFile.arrayBuffer());
    const ext = coverFile.name.split(".").pop() ?? "jpg";
    coverUrl = await uploadToR2(`covers/${id}.${ext}`, buf, coverFile.type || "image/jpeg");
  }

  if (pdfFile && pdfFile.size > 0) {
    const buf = Buffer.from(await pdfFile.arrayBuffer());
    pdfUrl = await uploadToR2(`pdfs/${id}.pdf`, buf, "application/pdf");
  }

  if (audioFile && audioFile.size > 0) {
    const buf = Buffer.from(await audioFile.arrayBuffer());
    const ext = audioFile.name.split(".").pop() ?? "mp3";
    audioUrl = await uploadToR2(`audio/${id}.${ext}`, buf, audioFile.type || "audio/mpeg");
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

  const title = form.get("title") as string;
  const titleKh = (form.get("title_kh") as string) || title;
  const category = (form.get("category") as string) || "general";
  const contentType = (form.get("content_type") as string) || "pdf";
  const content = (form.get("content") as string) || "";
  const tagsRaw = (form.get("tags") as string) || "";
  const tags = stringifyTagList(tagsRaw);
  const isPublished = form.get("is_published") === "on" ? 1 : 0;

  const result = await query(
    `INSERT INTO books (id, title, title_kh, author, publisher, published_year, language, category, tags, description, cover_url, pdf_url, audio_url, audio_start, audio_end, audio_offset, srt_content, srt_file_name, content, content_type, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      titleKh,
      (form.get("author") as string) || "",
      (form.get("publisher") as string) || "",
      Number(form.get("published_year") || 0) || null,
      (form.get("language") as string) || "km",
      category,
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
      content,
      contentType,
      isPublished,
    ]
  );

  if (!result.success) {
    console.error("D1 insert failed:", result.error);
    return NextResponse.json({ error: result.error ?? "Database insert failed" }, { status: 500 });
  }

  return NextResponse.json({ id });
}
