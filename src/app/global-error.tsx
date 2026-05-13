"use client";

import { useEffect } from "react";
import AppStatusView from "@/components/layout/AppStatusView";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="km">
      <head>
        <title>Server Error | KhmerLibrary</title>
      </head>
      <body className="app-global-error-shell">
        <AppStatusView
          variant="error"
          eyebrow="500"
          title="KhmerLibrary is temporarily unavailable"
          description="A root-level error stopped the app from rendering. Retry the page or return to the home screen."
          meta={error.digest ? `Error ID: ${error.digest}` : "Global application error"}
          actions={[
            { label: "Try Again", onClick: unstable_retry, tone: "secondary" },
            { label: "Go Home", href: "/", tone: "primary" },
          ]}
        />
      </body>
    </html>
  );
}
