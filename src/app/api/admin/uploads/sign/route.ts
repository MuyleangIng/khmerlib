import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getPresignedUploadUrl, getPublicUrlForKey } from "@/lib/r2";

const UPLOAD_CONFIG = {
  covers: { defaultExt: "jpg", fallbackType: "image/jpeg" },
  pdfs: { defaultExt: "pdf", fallbackType: "application/pdf" },
  audio: { defaultExt: "mp3", fallbackType: "audio/mpeg" },
  "content-images": { defaultExt: "jpg", fallbackType: "image/jpeg" },
} as const;

type UploadFolder = keyof typeof UPLOAD_CONFIG;

function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === "string" && value in UPLOAD_CONFIG;
}

function normalizeExtension(fileName: string, fallback: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || fallback;
}

function normalizeContentType(folder: UploadFolder, value: unknown): string {
  const fallback = UPLOAD_CONFIG[folder].fallbackType;
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim();
}

function isAllowedContentType(folder: UploadFolder, contentType: string): boolean {
  if (folder === "pdfs") return contentType.includes("pdf");
  if (folder === "audio") return contentType.startsWith("audio/");
  return contentType.startsWith("image/");
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const folder = body?.folder;

  if (!isUploadFolder(folder)) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }

  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const contentType = normalizeContentType(folder, body?.contentType);

  if (!isAllowedContentType(folder, contentType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = normalizeExtension(fileName, UPLOAD_CONFIG[folder].defaultExt);
  const key = `${folder}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({
    uploadUrl,
    publicUrl: getPublicUrlForKey(key),
    contentType,
  });
}
