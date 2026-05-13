"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PromptKind = "browser" | "ios";

const DISMISS_KEY = "khmerLibraryPwaInstallDismissedAt";
const DISMISS_DAYS = 7;

function isDismissedRecently() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PWAInstallPrompt() {
  const { t } = useI18n();
  const pathname = usePathname();
  const isReaderPage = pathname?.startsWith("/read/");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptKind, setPromptKind] = useState<PromptKind | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshed = false;
    const handleControllerChange = () => {
      if (!hadController) return;
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };

    const register = () => {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).then((registration) => {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        registration.update().catch(() => undefined);
      }).catch(() => undefined);
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (document.readyState === "complete") {
      register();
      return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (isReaderPage) {
      const frame = window.requestAnimationFrame(() => setPromptKind(null));
      return () => window.cancelAnimationFrame(frame);
    }

    const showIOSPrompt = window.requestAnimationFrame(() => {
      if (!isStandalone() && isIOS() && !isDismissedRecently()) {
        setPromptKind("ios");
      }
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandalone() || isDismissedRecently()) return;

      setPromptEvent(event as BeforeInstallPromptEvent);
      setPromptKind("browser");
    };

    const handleAppInstalled = () => {
      setPromptEvent(null);
      setPromptKind(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.cancelAnimationFrame(showIOSPrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isReaderPage]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setPromptKind(null);
  };

  const install = async () => {
    if (!promptEvent) return;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setPromptKind(null);
    }
    setPromptEvent(null);
  };

  if (!promptKind || isReaderPage) return null;

  return (
    <div className="pwa-install-card" role="status">
      <div className="pwa-install-icon" aria-hidden="true">
        {promptKind === "ios" ? <Share size={18} /> : <Download size={18} />}
      </div>
      <div className="pwa-install-copy">
        <p className="pwa-install-title">{t("pwa.title")}</p>
        <p className="pwa-install-text">
          {promptKind === "ios" ? t("pwa.ios") : t("pwa.browser")}
        </p>
      </div>
      <div className="pwa-install-actions">
        {promptKind === "browser" && (
          <button type="button" className="pwa-install-primary" onClick={install}>
            {t("pwa.install")}
          </button>
        )}
        <button type="button" className="pwa-install-close" onClick={dismiss} aria-label={t("pwa.dismiss")}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
