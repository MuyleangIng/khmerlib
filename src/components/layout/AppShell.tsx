"use client";

import Link from "next/link";
import { BookOpen, LibraryBig } from "lucide-react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import PWAInstallPrompt from "@/components/layout/PWAInstallPrompt";
import RouteProgress from "@/components/layout/RouteProgress";
import AppFooter from "@/components/layout/AppFooter";
import NetworkStatusBanner from "@/components/layout/NetworkStatusBanner";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import ClientSafeBoundary from "@/components/layout/ClientSafeBoundary";

function NavbarFallback() {
  return (
    <header
      className="site-navbar fixed top-0 left-0 right-0 z-50 border-b shadow-sm"
      style={{ background: "var(--bg-nav)", borderColor: "var(--border)" }}
    >
      <div className="site-nav-inner max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg shrink-0 select-none"
          style={{ color: "var(--foreground)" }}
        >
          <BookOpen size={22} style={{ color: "var(--accent)" }} />
          <span>KhmerLibrary</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/books"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <LibraryBig size={16} />
            <span>Books</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <I18nProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: "inherit", fontSize: "14px" },
              success: { style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" } },
              error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
            }}
          />
          <ClientSafeBoundary fallback={null}>
            <RouteProgress />
          </ClientSafeBoundary>
          <ClientSafeBoundary fallback={null}>
            <NetworkStatusBanner />
          </ClientSafeBoundary>
          <ClientSafeBoundary fallback={null}>
            <PWAInstallPrompt />
          </ClientSafeBoundary>
          <ClientSafeBoundary fallback={<NavbarFallback />}>
            <Navbar />
          </ClientSafeBoundary>
          <main className="min-h-screen pt-16">{children}</main>
          <ClientSafeBoundary fallback={null}>
            <AppFooter />
          </ClientSafeBoundary>
        </ThemeProvider>
      </I18nProvider>
    </ClerkProvider>
  );
}
