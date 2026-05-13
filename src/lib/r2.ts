import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return getPublicUrlForKey(key);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

export function getPublicUrlForKey(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export function isManagedR2Url(url: string): boolean {
  const publicUrl = process.env.R2_PUBLIC_URL;
  return Boolean(publicUrl && url.startsWith(`${publicUrl}/`));
}

export function getKeyFromUrl(url: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL!;
  return url.replace(`${publicUrl}/`, "");
}
