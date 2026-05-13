import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `content-images/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buf, file.type);

  return NextResponse.json({ url });
}
