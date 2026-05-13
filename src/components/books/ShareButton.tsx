"use client";
import { Copy, ExternalLink, Share2, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaFacebookF, FaInstagram, FaTelegram, FaXTwitter } from "react-icons/fa6";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function ShareButton({ title, text, url }: { title: string; text?: string; url?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [nativeShareActive, setNativeShareActive] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const getShareUrl = () => {
    if (typeof window === "undefined") return url || "";
    return url ? new URL(url, window.location.origin).toString() : window.location.href;
  };

  const copyLink = async (showNotice = true) => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt(t("action.copyLink"), shareUrl);
    }
    setOpen(false);
    if (showNotice) alert(t("action.linkCopied"));
  };

  const openShareWindow = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleNativeShare = async () => {
    if (!navigator.share || nativeShareActive) return;

    setNativeShareActive(true);
    const shareUrl = url ? new URL(url, window.location.origin).toString() : window.location.href;
    const shareData: ShareData = { title, text, url: shareUrl };

    try {
      await navigator.share(shareData);
      setOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) await copyLink();
    } finally {
      setNativeShareActive(false);
    }
  };

  const shareUrl = getShareUrl();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(text ? `${title} - ${text}` : title);
  const platforms = [
    {
      label: "Facebook",
      Icon: FaFacebookF,
      color: "#1877f2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "X / Twitter",
      Icon: FaXTwitter,
      color: "#111827",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Telegram",
      Icon: FaTelegram,
      color: "#229ed9",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ];

  const handleInstagram = async () => {
    await copyLink(false);
    openShareWindow("https://www.instagram.com/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition hover:opacity-80"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        <Share2 size={15} /> {t("action.share")}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border p-2 shadow-xl"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {platforms.map((platform) => (
            <button
              type="button"
              key={platform.label}
              onClick={() => openShareWindow(platform.href)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: platform.color }}
              >
                <platform.Icon size={16} />
              </span>
              <span className="flex-1">{platform.label}</span>
              <ExternalLink size={14} style={{ color: "var(--muted)" }} />
            </button>
          ))}

          <button
            type="button"
            onClick={handleInstagram}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "#c13584" }}
            >
              <FaInstagram size={16} />
            </span>
            <span className="flex-1">Instagram</span>
            <ExternalLink size={14} style={{ color: "var(--muted)" }} />
          </button>

          {typeof navigator !== "undefined" && Boolean(navigator.share) && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={nativeShareActive}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Smartphone size={15} />
              </span>
              <span className="flex-1">{t("action.shareMore")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => copyLink()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--background)", color: "var(--muted)" }}
            >
              <Copy size={15} />
            </span>
            <span className="flex-1">{t("action.copyLink")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
