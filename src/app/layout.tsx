import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_SEO_IMAGE_URL, SITE_TITLE } from "@/lib/share";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "បណ្ណាល័យខ្មែរ",
    "សៀវភៅខ្មែរ",
    "អានសៀវភៅខ្មែរ",
    "រឿងនិទានខ្មែរ",
    "អត្ថបទខ្មែរ",
    "PDF Khmer books",
    "Khmer books",
    "Khmer ebook",
    "Khmer literature",
    "Cambodian books",
    "digital library Cambodia",
    "KhmerLibrary",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "km_KH",
    alternateLocale: ["en_US"],
    images: [
      {
        url: SITE_SEO_IMAGE_URL,
        width: 1567,
        height: 907,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_SEO_IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/android/launchericon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android/launchericon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/ios/152.png", sizes: "152x152", type: "image/png" },
      { url: "/ios/167.png", sizes: "167x167", type: "image/png" },
      { url: "/ios/180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "KhmerLibrary",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#f8f7f4",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
