"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function AppFooter() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isReader = pathname === "/read" || pathname?.startsWith("/read/");

  if (isReader) return null;

  return (
    <footer
      className="border-t py-8 text-center text-sm"
      style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--bg-nav)" }}
    >
      <p>{t("footer.copy")}</p>
      <p className="mt-1">{t("footer.tagline")}</p>
    </footer>
  );
}
