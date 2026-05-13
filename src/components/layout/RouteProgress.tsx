"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setLoading(false), 180);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    const start = () => {
      setLoading(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setLoading(false), 2500);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
      if (!target || target.target || target.hasAttribute("download")) return;

      const nextUrl = new URL(target.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;

      start();
    };

    const stop = () => setLoading(false);

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", stop);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", stop);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={`route-progress ${loading ? "route-progress--active" : ""}`} aria-hidden="true">
      <span />
    </div>
  );
}
