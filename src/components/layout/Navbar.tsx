"use client";
import { useTheme } from "./ThemeProvider";
import { useUser, useClerk } from "@clerk/nextjs";
import { Sun, Moon, BookOpen, Shield, Settings, Search, X, Languages } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Book } from "@/lib/types";
import { useI18n } from "@/components/i18n/I18nProvider";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_IDS ?? "";

type SearchBook = Pick<Book, "id" | "title" | "title_kh" | "author" | "cover_url" | "description" | "category">;

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { t, toggleLocale } = useI18n();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const isAdmin = isSignedIn && ADMIN_USER_ID.split(",").includes(user?.id ?? "");

  // ── Scroll-hide behaviour ─────────────────────────────
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) {
        setNavVisible(true);
      } else if (y > lastScrollY.current + 4) {
        setNavVisible(false);
      } else if (y < lastScrollY.current - 4) {
        setNavVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Search state ──────────────────────────────────────
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (val: string) => {
    if (!val.trim()) return;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      setResults(await res.json());
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!q.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(q), 320);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, doSearch]);

  // close on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  const showDrop = open && q.trim().length > 0;
  const navShouldShow = navVisible || open;

  const closeSearch = () => {
    setOpen(false);
  };

  const submitSearch = () => {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/books?q=${encodeURIComponent(query)}`);
  };

  const handleSearchChange = (value: string) => {
    setQ(value);
    setOpen(true);
    if (value.trim()) {
      setLoading(true);
      return;
    }

    setResults([]);
    setLoading(false);
  };

  return (
    <>
      {/* Search backdrop */}
      {showDrop && (
        <div
          className="navbar-search-backdrop fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
          onClick={closeSearch}
        />
      )}

      <header
        className="site-navbar fixed top-0 left-0 right-0 z-50 border-b shadow-sm"
        style={{
          background: "var(--bg-nav)",
          borderColor: "var(--border)",
          transform: navShouldShow ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="site-nav-inner max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg shrink-0 select-none"
            style={{ color: "var(--foreground)" }}
          >
            <BookOpen size={22} style={{ color: "var(--accent)" }} />
            <span className="hidden sm:inline">{t("app.name")}</span>
          </Link>

          {/* Search */}
          <div ref={wrapRef} className="navbar-search relative flex-1 max-w-md">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--muted)" }}
              />
              <input
                value={q}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitSearch();
                  }
                }}
                onFocus={() => { if (q.trim()) setOpen(true); }}
                type="text"
                placeholder={t("nav.searchPlaceholder")}
                className="w-full pl-9 pr-8 py-2 rounded-full text-sm border outline-none"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  transition: "box-shadow 0.2s",
                  boxShadow: open && q ? "0 0 0 2px var(--accent)" : undefined,
                }}
              />
              {q && (
                <button
                  onClick={() => { setQ(""); setResults([]); closeSearch(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted)" }}
                  aria-label={t("nav.clearSearch")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ── Search dropdown ─────────────────────────── */}
            {showDrop && (
              <div
                className="search-dropdown absolute top-full left-0 right-0 mt-2 rounded-2xl border overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                  zIndex: 51,
                  animation: "fadeIn 0.18s ease both",
                }}
              >
                {loading ? (
                  /* Loading skeletons */
                  <div className="p-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="skeleton-block rounded-lg flex-shrink-0" style={{ width: 40, height: 56 }} />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="skeleton-block h-3 rounded" style={{ width: "70%" }} />
                          <div className="skeleton-block h-2.5 rounded" style={{ width: "45%" }} />
                          <div className="skeleton-block h-2 rounded" style={{ width: "85%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-10 text-center" style={{ color: "var(--muted)" }}>
                    <Search size={30} className="mx-auto mb-2 opacity-25" />
                    <p className="text-sm font-medium">{t("nav.noResults", { query: q })}</p>
                    <p className="text-xs mt-0.5 opacity-70">{t("nav.noResultsHint")}</p>
                  </div>
                ) : (
                  <>
                    <p
                      className="px-4 pt-3 pb-1.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: "var(--muted)" }}
                    >
                      {t("nav.results", { count: results.length })}
                    </p>
                    <ul>
                      {results.map((book) => (
                        <li key={book.id}>
                          <Link
                            href={`/books/${book.id}`}
                            className="search-result-row flex gap-3 px-4 py-3 items-start"
                            onClick={() => { closeSearch(); setQ(""); }}
                          >
                            {/* Thumbnail */}
                            <div
                              className="rounded-lg overflow-hidden flex-shrink-0"
                              style={{ width: 40, height: 56, background: "var(--border)" }}
                            >
                              {book.cover_url ? (
                                <Image
                                  src={book.cover_url}
                                  alt={book.title}
                                  width={40}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, var(--accent) 0%, #8b2fc9 100%)" }}
                                >
                                  <BookOpen size={14} color="rgba(255,255,255,0.8)" />
                                </div>
                              )}
                            </div>

                            {/* Text */}
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-semibold line-clamp-1 leading-snug"
                                style={{ color: "var(--foreground)" }}
                              >
                                {book.title_kh || book.title}
                              </p>
                              {book.author && (
                                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                                  {book.author}
                                </p>
                              )}
                              {book.description && (
                                <p
                                  className="text-xs mt-1 line-clamp-2 leading-relaxed"
                                  style={{ color: "var(--muted)", opacity: 0.85 }}
                                >
                                  {book.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="search-view-all"
                      onClick={submitSearch}
                      style={{ borderTop: "1px solid var(--border)", color: "var(--accent)" }}
                    >
                      {t("nav.viewAllResults", { query: q.trim() })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggle}
              className="p-2 rounded-full transition hover:opacity-70"
              style={{ color: "var(--muted)" }}
              title={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              onClick={toggleLocale}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-bold transition hover:opacity-70"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
              title={t("nav.languageTitle")}
            >
              <Languages size={16} />
              <span>{t("nav.language")}</span>
            </button>

            <Link
              href="/settings"
              className="p-2 rounded-full transition hover:opacity-70"
              style={{ color: "var(--muted)" }}
              title={t("nav.settings")}
            >
              <Settings size={18} />
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Shield size={13} /> Admin
              </Link>
            )}

            {isAdmin && (
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="text-xs px-3 py-1.5 rounded-full border transition hover:opacity-70"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                ចាកចេញ
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
