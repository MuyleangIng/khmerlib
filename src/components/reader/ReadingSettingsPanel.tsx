"use client";

import { useState } from "react";
import { DEFAULT_READING_SETTINGS, ReadingSettings, READING_THEMES } from "@/lib/types";
import { KHMER_FONTS } from "@/lib/fonts";
import { Check, ChevronDown, Minus, Palette, Plus, Settings, Type, X } from "lucide-react";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/components/i18n/I18nProvider";

const THEME_LABEL_KEYS: Record<ReadingSettings["theme"], "theme.default" | "theme.sepia" | "theme.dark" | "theme.green"> = {
  default: "theme.default",
  sepia: "theme.sepia",
  dark: "theme.dark",
  green: "theme.green",
};

const THEME_SWATCHES: Record<ReadingSettings["theme"], { fill: string; ring: string }> = {
  default: { fill: "#f8fafc", ring: "#cbd5e1" },
  sepia: { fill: "#ead9bd", ring: "#d2b489" },
  dark: { fill: "#1f2937", ring: "#475569" },
  green: { fill: "#d8eadc", ring: "#9ec5a5" },
};

export default function ReadingSettingsPanel({
  settings,
  onChange,
}: {
  settings: ReadingSettings;
  onChange: (s: ReadingSettings) => void;
}) {
  const { t } = useI18n();
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const setFontSize = (size: number) =>
    onChange({ ...settings, fontSize: Math.min(36, Math.max(12, size)) });
  const setTheme = (theme: ReadingSettings["theme"]) =>
    onChange({ ...settings, theme });
  const setFont = (fontFamily: string) => {
    onChange({ ...settings, fontFamily: fontFamily as ReadingSettings["fontFamily"] });
    setFontMenuOpen(false);
  };

  const currentFont = KHMER_FONTS.find((font) => font.id === settings.fontFamily)
    ?? KHMER_FONTS.find((font) => font.id === DEFAULT_READING_SETTINGS.fontFamily)
    ?? KHMER_FONTS[0];

  return (
    <div className="reader-settings-shell">
      <DialogHeader className="reader-settings-head">
        <div className="reader-settings-head-copy">
          <div className="reader-settings-head-icon" aria-hidden="true">
            <Settings size={16} />
          </div>
          <div className="min-w-0">
            <DialogTitle>{t("settings.title")}</DialogTitle>
            <DialogDescription>
              {currentFont.name} · {settings.fontSize}px
            </DialogDescription>
          </div>
        </div>
        <DialogClose asChild>
          <button type="button" className="reader-settings-close-btn" aria-label={t("settings.close")}>
            <X size={16} />
          </button>
        </DialogClose>
      </DialogHeader>

      <div className="reader-settings-stack">
        <section className="reader-settings-card">
          <div className="reader-settings-label-row">
            <span className="reader-settings-label">{t("settings.fontSize")}</span>
            <span className="reader-settings-value">{settings.fontSize}px</span>
          </div>
          <div className="reader-settings-size-row">
            <button
              type="button"
              onClick={() => setFontSize(settings.fontSize - 1)}
              className="reader-settings-stepper"
              aria-label={`${t("settings.fontSize")} -`}
            >
              <Minus size={14} />
            </button>
            <input
              type="range"
              min={12}
              max={36}
              value={settings.fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              className="reader-settings-slider"
            />
            <button
              type="button"
              onClick={() => setFontSize(settings.fontSize + 1)}
              className="reader-settings-stepper"
              aria-label={`${t("settings.fontSize")} +`}
            >
              <Plus size={14} />
            </button>
          </div>
        </section>

        <section className="reader-settings-card">
          <div className="reader-settings-label-row">
            <span className="reader-settings-label reader-settings-label--icon">
              <Palette size={14} />
              {t("settings.background")}
            </span>
          </div>
          <div className="reader-settings-theme-grid">
            {(Object.keys(READING_THEMES) as ReadingSettings["theme"][]).map((themeKey) => {
              const active = settings.theme === themeKey;
              const swatch = THEME_SWATCHES[themeKey];
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => setTheme(themeKey)}
                  className={`reader-settings-chip reader-settings-chip--theme ${active ? "reader-settings-chip--active" : ""}`}
                >
                  <span
                    className="reader-settings-chip-swatch"
                    aria-hidden="true"
                    style={{ background: swatch.fill, boxShadow: `inset 0 0 0 1px ${swatch.ring}` }}
                  />
                  <span>{t(THEME_LABEL_KEYS[themeKey])}</span>
                  {active && (
                    <span className="reader-settings-chip-check" aria-hidden="true">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="reader-settings-card">
          <div className="reader-settings-label-row">
            <span className="reader-settings-label reader-settings-label--icon">
              <Type size={14} />
              {t("settings.font")}
            </span>
          </div>
          <div className="reader-settings-select-wrap">
            <button
              type="button"
              onClick={() => setFontMenuOpen((open) => !open)}
              className={`reader-settings-select ${fontMenuOpen ? "reader-settings-select--open" : ""}`}
              aria-expanded={fontMenuOpen}
              aria-haspopup="listbox"
            >
              <div className="reader-settings-select-copy">
                <span className="reader-settings-font-name">{currentFont.name}</span>
                <span
                  className="reader-settings-font-preview"
                  style={{ fontFamily: `"${currentFont.google}", system-ui, sans-serif` }}
                >
                  {currentFont.preview}
                </span>
              </div>
              <ChevronDown
                size={16}
                className="reader-settings-select-icon"
                style={{ transform: fontMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {fontMenuOpen && (
              <div className="reader-settings-dropdown" role="listbox" aria-label={t("settings.font")}>
                {KHMER_FONTS.map((font) => {
                  const active = settings.fontFamily === font.id
                    || (!settings.fontFamily && font.id === DEFAULT_READING_SETTINGS.fontFamily);
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setFont(font.id)}
                      className={`reader-settings-option ${active ? "reader-settings-option--active" : ""}`}
                    >
                      <div className="reader-settings-option-copy">
                        <span className="reader-settings-font-name">{font.name}</span>
                        <span
                          className="reader-settings-font-preview"
                          style={{ fontFamily: `"${font.google}", system-ui, sans-serif` }}
                        >
                          {font.preview}
                        </span>
                      </div>
                      {active && (
                        <span className="reader-settings-chip-check" aria-hidden="true">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="reader-settings-card">
          <div className="reader-settings-label-row">
            <span className="reader-settings-label">{t("settings.preview")}</span>
          </div>
          <div
            className="reader-settings-preview-mini"
            style={{
              background: READING_THEMES[settings.theme].bg,
              color: READING_THEMES[settings.theme].text,
              fontSize: `${settings.fontSize}px`,
              fontFamily: `"${currentFont.google}", system-ui, sans-serif`,
            }}
          >
            {t("settings.previewText")}
          </div>
        </section>
      </div>

      <DialogFooter className="reader-settings-actions">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_READING_SETTINGS)}
          className="reader-settings-reset-btn"
        >
          {t("settings.reset")}
        </button>
      </DialogFooter>
    </div>
  );
}
