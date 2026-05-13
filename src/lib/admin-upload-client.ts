export type AdminUploadFolder = "covers" | "pdfs" | "audio" | "content-images";

const DEFAULT_CONTENT_TYPES: Record<AdminUploadFolder, string> = {
  covers: "image/jpeg",
  pdfs: "application/pdf",
  audio: "audio/mpeg",
  "content-images": "image/jpeg",
};

async function parseJsonSafely(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function uploadAdminFile(file: File, folder: AdminUploadFolder): Promise<string> {
  const contentType = file.type || DEFAULT_CONTENT_TYPES[folder];

  const signRes = await fetch("/api/admin/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType,
    }),
  });

  const signData = await parseJsonSafely(signRes);
  if (!signRes.ok) {
    throw new Error(
      typeof signData?.error === "string" ? signData.error : "Failed to prepare upload"
    );
  }

  const uploadUrl = typeof signData?.uploadUrl === "string" ? signData.uploadUrl : "";
  const publicUrl = typeof signData?.publicUrl === "string" ? signData.publicUrl : "";
  const signedContentType =
    typeof signData?.contentType === "string" ? signData.contentType : contentType;

  if (!uploadUrl || !publicUrl) {
    throw new Error("Upload endpoint did not return a signed URL");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": signedContentType,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const message = (await uploadRes.text().catch(() => "")).trim();
    throw new Error(message || "File upload failed");
  }

  return publicUrl;
}
