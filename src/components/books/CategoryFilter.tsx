"use client";
import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function CategoryFilter({
  active,
  sort,
}: {
  active: string;
  sort: string;
}) {
  const { locale } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setShowLeft(scrollRef.current.scrollLeft > 10);
    setShowRight(
      scrollRef.current.scrollLeft + scrollRef.current.clientWidth < scrollRef.current.scrollWidth - 10
    );
  };

  return (
    <div className="relative flex items-center mb-4">
      {showLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 p-1 rounded-full shadow"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.value === active;
          return (
            <Link
              key={cat.value}
              href={`/?category=${cat.value}&sort=${sort}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap"
              style={
                isActive
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--bg-card)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {locale === "km" ? cat.labelKh : cat.label}
            </Link>
          );
        })}
      </div>

      {showRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 p-1 rounded-full shadow"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
