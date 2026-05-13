import type { Metadata } from "next";
import { Book } from "@/lib/types";

export const SITE_NAME = "KhmerLibrary";
export const SITE_TITLE = "បណ្ណាល័យខ្មែរ - KhmerLibrary";
export const SITE_DESCRIPTION =
  "អានសៀវភៅខ្មែរ រឿងនិទាន អត្ថបទ និង PDF ដោយឥតគិតថ្លៃលើ KhmerLibrary។ បណ្ណាល័យឌីជីថលសម្រាប់អ្នកអានខ្មែរ លើទូរស័ព្ទ និងកុំព្យូទ័រ។";
export const SITE_SEO_IMAGE_URL =
  "https://pub-ebe0a22eb8c24fb5833c1ebbce55fd3d.r2.dev/seo/khmer-library-thumbnail.png";
export const DEFAULT_SITE_URL = "https://khmerlibrary.vercel.app";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return DEFAULT_SITE_URL;
}

export function getBookDisplayTitle(book: Pick<Book, "title" | "title_kh">) {
  return book.title_kh || book.title || "KhmerLibrary";
}

export function getBookDescription(book: Pick<Book, "description" | "author">) {
  return book.description || (book.author ? `Read by ${book.author} on KhmerLibrary` : "Read on KhmerLibrary");
}

export function getBookShareMetadata(book: Book, pathname: string): Metadata {
  const siteUrl = getSiteUrl();
  const title = getBookDisplayTitle(book);
  const description = getBookDescription(book);
  const url = new URL(pathname, siteUrl).toString();
  const image = new URL(book.cover_url || "/icons/icon-512.png", siteUrl).toString();
  const images = [{ url: image, alt: title }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function makePdfFileName(book: Pick<Book, "title" | "title_kh">) {
  const title = getBookDisplayTitle(book)
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return `${title || "KhmerLibrary-book"}.pdf`;
}

export function contentDispositionAttachment(fileName: string) {
  const fallback = fileName
    .replace(/[^\x20-\x7e]+/g, "")
    .replace(/["\\]+/g, "")
    .trim() || "KhmerLibrary-book.pdf";
  const encoded = encodeURIComponent(fileName)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
