"use client";
import { useTheme } from "./ThemeProvider";
import { KHMER_FONTS } from "@/lib/fonts";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Type, Check, X } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function SettingsClient() {
  const { theme, toggle, fontId, setFont } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="settings-page max-w-5xl mx-auto px-4 py-8">
      <div
        className="settings-hero"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="settings-icon-button"
          style={{ color: "var(--muted)", borderColor: "var(--border)" }}
          aria-label={t("settings.back")}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            {t("app.nameEnglish")}
          </p>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
            {t("settings.pageTitle")}
          </h1>
        </div>
        <Link
          href="/"
          className="settings-icon-button"
          style={{ color: "var(--muted)", borderColor: "var(--border)" }}
          aria-label={t("settings.close")}
        >
          <X size={18} />
        </Link>
      </div>

      <div className="settings-layout">
      {/* ── Theme ──────────────────────────────────── */}
      <section
        className="settings-section rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          {theme === "dark" ? <Moon size={18} style={{ color: "var(--accent)" }} /> : <Sun size={18} style={{ color: "var(--accent)" }} />}
          <h2 className="font-bold" style={{ color: "var(--foreground)" }}>
            {t("settings.displayMode")}
          </h2>
        </div>

        <div className="settings-theme-grid">
          {(["light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { if (theme !== mode) toggle(); }}
              className="flex-1 py-4 rounded-xl flex flex-col items-center gap-2 border-2 transition"
              style={{
                borderColor: theme === mode ? "var(--accent)" : "var(--border)",
                background: mode === "dark" ? "#1a1a1a" : "#ffffff",
              }}
            >
              {mode === "dark" ? <Moon size={20} color="#ededed" /> : <Sun size={20} color="#1a1a1a" />}
              <span className="text-sm font-semibold" style={{ color: mode === "dark" ? "#ededed" : "#1a1a1a" }}>
                {mode === "light" ? t("settings.light") : t("settings.darkMode")}
              </span>
              {theme === mode && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#fff" }}>
                  ✓ {t("settings.active")}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Khmer Font ─────────────────────────────── */}
      <section
        className="settings-section settings-section--wide rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Type size={18} style={{ color: "var(--accent)" }} />
          <h2 className="font-bold" style={{ color: "var(--foreground)" }}>
            {t("settings.khmerFont")}
          </h2>
        </div>

        <div className="space-y-3">
          {KHMER_FONTS.map((font) => {
            const active = fontId === font.id;
            return (
              <button
                key={font.id}
                onClick={() => setFont(font.id)}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 transition text-left"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent-light)" : "var(--bg)",
                }}
              >
                <div className="flex-1">
                  {/* Font name */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                      {font.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      · {font.nameKh}
                    </span>
                  </div>
                  {/* Live preview in the actual font */}
                  <p
                    className="text-base"
                    style={{
                      fontFamily: `"${font.google}", system-ui, sans-serif`,
                      color: "var(--foreground)",
                      lineHeight: 1.8,
                    }}
                  >
                    {font.preview}
                  </p>
                </div>

                {active && (
                  <span
                    className="ml-4 shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent)" }}
                  >
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--muted)" }}>
          {t("settings.fontsHint")}
        </p>
      </section>
      </div>
    </div>
  );
}
