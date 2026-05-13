import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/share";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: "KhmerLibrary",
    description: SITE_DESCRIPTION,
    id: "/",
    lang: "km",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    background_color: "#f8f7f4",
    theme_color: "#c8502a",
    categories: ["books", "education", "reference"],
    icons: [
      {
        src: "/android/launchericon-48x48.png",
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/windows/Square44x44Logo.targetsize-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/windows/Square150x150Logo.scale-100.png",
        sizes: "150x150",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/windows/LargeTile.scale-100.png",
        sizes: "310x310",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android/launchericon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
