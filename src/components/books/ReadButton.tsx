"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function ReadButton({
  bookId,
  contentType,
}: {
  bookId: string;
  contentType: string;
}) {
  const { t } = useI18n();

  return (
    <Link
      href={`/read/${bookId}`}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition hover:opacity-90"
      style={{ background: "var(--accent)", color: "#fff" }}
    >
      <BookOpen size={16} />
      {contentType === "pdf" ? t("action.openPdf") : t("action.readArticle")}
    </Link>
  );
}
