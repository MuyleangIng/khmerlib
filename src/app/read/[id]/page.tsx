import type { Metadata } from "next";
import { queryFirst } from "@/lib/db";
import { Book } from "@/lib/types";
import { notFound } from "next/navigation";
import ReaderClient from "@/components/reader/ReaderClient";
import { getBookShareMetadata } from "@/lib/share";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getReaderBook(id: string) {
  const withSrt =
    "SELECT id, title, title_kh, cover_url, pdf_url, audio_url, audio_start, audio_end, audio_offset, srt_content, srt_file_name, content, content_type, language FROM books WHERE id = ?";
  const withoutSrt =
    "SELECT id, title, title_kh, cover_url, pdf_url, audio_url, audio_start, audio_end, audio_offset, content, content_type, language FROM books WHERE id = ?";

  return queryFirst<Book>(withSrt, [id]).catch(() => queryFirst<Book>(withoutSrt, [id]).catch(() => null));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await queryFirst<Book>("SELECT * FROM books WHERE id = ? AND is_published = 1", [id]).catch(
    () => null
  );

  return book ? getBookShareMetadata(book, `/read/${id}`) : {};
}

export default async function ReadPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getReaderBook(id);

  if (!book) notFound();

  return <ReaderClient book={book} />;
}
