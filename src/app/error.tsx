"use client";

import { useEffect } from "react";
import AppStatusView from "@/components/layout/AppStatusView";

export default function Error({
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
    <AppStatusView
      variant="error"
      eyebrow="500"
      title="Something went wrong"
      description="This page hit a temporary error. Try loading it again or go back to the library."
      meta={error.digest ? `Error ID: ${error.digest}` : "Temporary application error"}
      actions={[
        { label: "Try Again", onClick: unstable_retry, tone: "secondary" },
        { label: "Go Home", href: "/", tone: "primary" },
      ]}
    />
  );
}
