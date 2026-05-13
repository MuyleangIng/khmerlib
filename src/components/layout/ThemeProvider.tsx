"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { KHMER_FONTS, DEFAULT_FONT_ID, getFontById, buildGoogleFontUrl } from "@/lib/fonts";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  fontId: string;
  setFont: (id: string) => void;
}>({
  theme: "light",
  toggle: () => {},
  fontId: DEFAULT_FONT_ID,
  setFont: () => {},
});

function applyFont(id: string) {
  const font = getFontById(id);
  document.documentElement.style.setProperty("--font-khmer", `"${font.google}", system-ui, sans-serif`);
  document.body.style.fontFamily = `"${font.google}", system-ui, sans-serif`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontId, setFontId] = useState(DEFAULT_FONT_ID);

  // Load all Khmer fonts once (so previews render correctly)
  useEffect(() => {
    const url = buildGoogleFontUrl(KHMER_FONTS);
    if (!document.querySelector(`link[data-khmer-fonts]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.setAttribute("data-khmer-fonts", "1");
      document.head.appendChild(link);
    }
  }, []);

  // Restore saved theme & font
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const initialTheme = savedTheme ?? preferred;
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);

      const savedFont = localStorage.getItem("khmerFont") ?? DEFAULT_FONT_ID;
      setFontId(savedFont);
      applyFont(savedFont);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const setFont = (id: string) => {
    setFontId(id);
    localStorage.setItem("khmerFont", id);
    applyFont(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, fontId, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
